#!/usr/bin/env node
/**
 * scripts/audit-perf.mjs — the performance gate.
 *
 * Spec: design/05-build-spec.md §H.1, doc 03 §2.5.
 *
 * Builds (unless --no-build), starts `next start` on port 3111, polls for a
 * 200, runs Lighthouse 13.5.0 three times and asserts the MEDIAN against the
 * §H.1 CI-gate thresholds, runs the byte budgets, writes reports/perf-report.json,
 * and exits non-zero on any breach.
 *
 * Sandbox notes (doc 03 §10.1) — all of these are set here so the script works
 * whether or not the caller exported them:
 *   CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
 *   NO_PROXY=localhost,127.0.0.1   no_proxy=localhost,127.0.0.1
 * Without the NO_PROXY pair, fetch() to http://127.0.0.1:3111 returns nothing in
 * this sandbox and the readiness poll hangs. Chromium reaches localhost fine —
 * that asymmetry is the confusing part.
 *
 * Flags:
 *   --no-build   reuse the existing .next
 *   --no-gate    report the scores but never fail on them (WP1 owns hero perf)
 *   --runs=N     Lighthouse runs (default 3)
 */

import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 3111;
const DEBUG_PORT = 9222;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const REPORTS = join(ROOT, 'reports');

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const RUNS = Number((args.find((a) => a.startsWith('--runs=')) ?? '--runs=3').split('=')[1]) || 3;

const CHROME =
  process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

process.env.NO_PROXY = 'localhost,127.0.0.1';
process.env.no_proxy = 'localhost,127.0.0.1';

/** §H.1, default mobile simulate (1638 Kbps, 150 ms RTT, 4x CPU, 412x823 @1.75). */
const GATE = {
  'first-contentful-paint': { max: 1000, label: 'FCP' },
  'largest-contentful-paint': { max: 1800, label: 'LCP' },
  interactive: { max: 2500, label: 'TTI' },
  'total-blocking-time': { max: 150, label: 'TBT' },
  'cumulative-layout-shift': { max: 0, label: 'CLS' },
};
const SCORE_GATE = { performance: 0.95, accessibility: 1.0 };

function log(...a) {
  console.log(...a);
}

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function waitFor(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status >= 200 && res.status < 400) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

function run(cmd, cmdArgs) {
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit', env: process.env });
  return r.status === 0;
}

let failed = false;
const fail = (m) => {
  console.error(`✗ ${m}`);
  failed = true;
};

/* ------------------------------------------------------------ build */

if (!has('--no-build')) {
  log('› building…');
  if (!run('pnpm', ['build'])) {
    console.error('✗ build failed');
    process.exit(1);
  }
}
if (!existsSync(join(ROOT, '.next', 'BUILD_ID'))) {
  console.error('✗ no build output — run `pnpm build` first.');
  process.exit(1);
}

/* ------------------------------------------------------------ budgets */

log('\n› byte budgets…');
const budgetOk = run('node', [join(ROOT, 'scripts', 'bundle-budget.mjs')]);
if (!budgetOk) fail('byte budgets failed (see above)');

/* ------------------------------------------------------------ server */

log(`\n› starting next start on ${PORT}…`);
const server = spawn('pnpm', ['start', '-p', String(PORT)], {
  cwd: ROOT,
  env: { ...process.env, NO_PROXY: 'localhost,127.0.0.1', no_proxy: 'localhost,127.0.0.1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', () => {});
server.stderr.on('data', (d) => process.stderr.write(d));

let chrome = null;
function shutdown() {
  try {
    chrome?.kill('SIGKILL');
  } catch {
    /* already gone */
  }
  try {
    server.kill('SIGTERM');
  } catch {
    /* already gone */
  }
}
process.on('exit', shutdown);
process.on('SIGINT', () => {
  shutdown();
  process.exit(130);
});

if (!(await waitFor(ORIGIN, 90_000))) {
  shutdown();
  console.error(`✗ ${ORIGIN} never answered — did you export NO_PROXY=localhost,127.0.0.1 ?`);
  process.exit(1);
}
log('  server up');

/* ------------------------------------------------------------ chrome */

if (!existsSync(CHROME)) {
  shutdown();
  console.error(`✗ no Chrome at ${CHROME}. Set CHROME_PATH. Never run \`playwright install\`.`);
  process.exit(1);
}

chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--user-data-dir=/tmp/loop-lh-profile',
    'about:blank',
  ],
  { stdio: ['ignore', 'ignore', 'ignore'] },
);

if (!(await waitFor(`http://127.0.0.1:${DEBUG_PORT}/json/version`, 30_000))) {
  shutdown();
  console.error('✗ Chrome devtools endpoint never answered');
  process.exit(1);
}

/* ------------------------------------------------------------ lighthouse */

log(`\n› lighthouse ${RUNS}x (default mobile simulate)…`);
const runsOut = [];
for (let i = 0; i < RUNS; i++) {
  const result = await lighthouse(
    `${ORIGIN}/`,
    { port: DEBUG_PORT, output: 'json', logLevel: 'error' },
    undefined,
  );
  const lhr = result?.lhr;
  if (!lhr) {
    fail(`lighthouse run ${i + 1} produced no result`);
    continue;
  }
  runsOut.push({
    performance: lhr.categories.performance?.score ?? 0,
    accessibility: lhr.categories.accessibility?.score ?? 0,
    'best-practices': lhr.categories['best-practices']?.score ?? 0,
    seo: lhr.categories.seo?.score ?? 0,
    audits: Object.fromEntries(
      Object.keys(GATE).map((k) => [k, lhr.audits[k]?.numericValue ?? null]),
    ),
  });
  log(
    `  run ${i + 1}: perf ${(runsOut[i].performance * 100).toFixed(0)} · a11y ${(runsOut[i].accessibility * 100).toFixed(0)}`,
  );
}

shutdown();

if (runsOut.length === 0) {
  console.error('✗ no lighthouse results');
  process.exit(1);
}

const medians = {
  performance: median(runsOut.map((r) => r.performance)),
  accessibility: median(runsOut.map((r) => r.accessibility)),
  'best-practices': median(runsOut.map((r) => r['best-practices'])),
  seo: median(runsOut.map((r) => r.seo)),
  audits: Object.fromEntries(
    Object.keys(GATE).map((k) => [
      k,
      median(runsOut.map((r) => r.audits[k]).filter((v) => v !== null)),
    ]),
  ),
};

log('\nLOOP — lighthouse medians');
log('─'.repeat(52));
log(`  performance    ${(medians.performance * 100).toFixed(0)} / 95`);
log(`  accessibility  ${(medians.accessibility * 100).toFixed(0)} / 100`);
log(`  best practices ${(medians['best-practices'] * 100).toFixed(0)}`);
log(`  seo            ${(medians.seo * 100).toFixed(0)}`);
for (const [key, { max, label }] of Object.entries(GATE)) {
  const v = medians.audits[key];
  const shown = key === 'cumulative-layout-shift' ? v?.toFixed(3) : `${Math.round(v ?? 0)} ms`;
  log(`  ${label.padEnd(14)} ${String(shown).padStart(8)}  / ${max}${key === 'cumulative-layout-shift' ? '' : ' ms'}`);
}
log('─'.repeat(52));

mkdirSync(REPORTS, { recursive: true });
const reportPath = join(REPORTS, 'perf-report.json');
writeFileSync(
  reportPath,
  JSON.stringify({ at: new Date().toISOString(), url: `${ORIGIN}/`, runs: runsOut, medians }, null, 2),
);
log(`  report → ${reportPath.replace(ROOT + '/', '')}`);

if (!has('--no-gate')) {
  for (const [key, { max, label }] of Object.entries(GATE)) {
    const v = medians.audits[key];
    if (v === null || Number.isNaN(v)) continue;
    if (v > max + (key === 'cumulative-layout-shift' ? 0.0001 : 0)) {
      fail(`${label} median ${key === 'cumulative-layout-shift' ? v.toFixed(3) : Math.round(v) + ' ms'} over ${max}`);
    }
  }
  if (medians.performance < SCORE_GATE.performance) {
    fail(`performance median ${(medians.performance * 100).toFixed(0)} under ${SCORE_GATE.performance * 100}`);
  }
  if (medians.accessibility < SCORE_GATE.accessibility) {
    fail(`accessibility median ${(medians.accessibility * 100).toFixed(0)} under 100`);
  }
}

if (failed) {
  console.error('\n✗ audit:perf FAILED');
  process.exit(1);
}
log('\n✓ audit:perf OK');
process.exit(0);
