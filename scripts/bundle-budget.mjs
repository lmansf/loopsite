#!/usr/bin/env node
/**
 * scripts/bundle-budget.mjs — the byte gate.
 *
 * Spec: design/11-narrative-build-spec.md §E, §H.1. **OWNED BY WP-D.**
 *
 *   Tier A   render-blocking (the stylesheet + the inline bootstrap) <= 14 KB gz, HARD
 *   Tier B   first-party JS on the landing route, excluding the
 *            React/Next runtime floor                                <= 90 KB gz, HARD
 *   Tier C   total JS transferred on the landing route               <= 230 KB gz, soft
 *   CSS      total                                                   <= 14 KB gz
 *   Document the prerendered landing HTML, gzipped                   <= 40 KB gz, HARD
 *            and every prerendered alias document with it             <= 40 KB gz, HARD
 *   Flight   the inline RSC payload (self.__next_f.push), gzipped    <= 18 KB gz, HARD
 *   Fonts    0 bytes.   Raster images   0 bytes.
 *   Origins  third-party origins fetched by the document             0, HARD (§E item 5)
 *   Figures  EVERY lazy chunk <= 2 KB gz
 *
 * WP-D extended three of those so the whole build is measured, not a sample of
 * it: the alias routes carry the same corpus and are prerendered, so they are
 * weighed against the document budget too; the figure ceiling is applied to
 * every lazy chunk rather than to the five largest; and "zero third-party
 * origins, zero fonts, zero images, zero embeds" (§E item 5) is now a gate
 * instead of a promise.
 *
 * The document and the flight are the only genuinely new risk in this build:
 * the page now carries ~5000 words, and it carries them TWICE — once as the
 * HTML the reader gets and once in the inline payload React uses to reconcile.
 * The prose is injected as one compiled string per account precisely so the
 * second copy is the text and not a tree of several thousand element
 * descriptors (§E item 2). If the flight budget starts failing, the first
 * thing to look at is markup that has become JSX and should be a string.
 *
 * It parses the prerendered landing document in .next/server/app/index.html,
 * gzips every asset it references, and subtracts the framework floor recorded
 * in perf-baseline.json. Run it after `pnpm build`.
 */

import { gzipSync } from 'node:zlib';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NEXT = join(ROOT, process.env.NEXT_DIST_DIR || '.next');
const HTML = join(NEXT, 'server', 'app', 'index.html');
const BASELINE = join(ROOT, 'perf-baseline.json');

const KB = 1024;
const BUDGETS = {
  tierA: 14 * KB,
  tierB: 90 * KB,
  tierC: 230 * KB,
  css: 14 * KB,
  doc: 40 * KB,
  flight: 18 * KB,
  figure: 2 * KB,
};

function gz(buf) {
  return gzipSync(buf, { level: 9 }).length;
}

function assetPath(url) {
  if (!url.startsWith('/_next/')) return null;
  return join(NEXT, url.slice('/_next/'.length).split('?')[0]);
}

function readAsset(url) {
  const p = assetPath(url);
  if (!p || !existsSync(p)) return null;
  return readFileSync(p);
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
}

function fmt(bytes) {
  return `${(bytes / KB).toFixed(1)} KB`;
}

if (!existsSync(HTML)) {
  console.error('✗ no build output — run `pnpm build` first.');
  process.exit(1);
}

const htmlBuf = readFileSync(HTML);
const html = htmlBuf.toString('utf8');

/* ------------------------------------------- the document and the flight */

// The whole prerendered landing document, as the reader receives it.
const docBytes = gz(htmlBuf);

// The inline RSC flight payload: every `self.__next_f.push(...)` script at the
// end of <body>. Not render-blocking, so it is not Tier A — but it is the one
// place the 5000 words can quietly ship a second time.
const flightChunks = [...html.matchAll(/self\.__next_f\.push\(([\s\S]*?)\)<\/script>/g)].map(
  (m) => m[1],
);
const flightBytes = flightChunks.length > 0 ? gz(Buffer.from(flightChunks.join(''), 'utf8')) : 0;

// The alias routes are prerendered and carry the same corpus; §E's document
// budget is about what a reader receives, and a reader can receive one of
// these. Measured against the same ceiling, reported as the worst case.
const aliasDocs = walk(join(NEXT, 'server', 'app', 's'))
  .filter((p) => p.endsWith('.html'))
  .map((p) => ({ p, size: gz(readFileSync(p)) }))
  .sort((a, b) => b.size - a.size);
const worstAlias = aliasDocs[0] ?? null;

/* --------------------------------------------- third-party origins (§E.5) */

// Zero third-party origins, zero fonts, zero images, zero embeds. Only
// elements that FETCH are counted: a canonical link or an og:url is a string,
// not a request.
const FETCHERS = [
  /<script[^>]+src="(https?:\/\/[^"]+)"/g,
  /<link[^>]+rel="(?:stylesheet|preload|prefetch|preconnect|dns-prefetch|modulepreload)"[^>]*href="(https?:\/\/[^"]+)"/g,
  /<link[^>]+href="(https?:\/\/[^"]+)"[^>]*rel="(?:stylesheet|preload|prefetch|preconnect|dns-prefetch|modulepreload)"/g,
  /<(?:img|iframe|video|audio|source|embed|track)[^>]+src="(https?:\/\/[^"]+)"/g,
  /@import\s+url\(["']?(https?:\/\/[^)"']+)/g,
];
const origins = new Set();
for (const re of FETCHERS) {
  for (const m of html.matchAll(re)) {
    try {
      origins.add(new URL(m[1]).origin);
    } catch {
      /* not a URL we can parse is not an origin we can fetch */
    }
  }
}

/* ------------------------------------------------------------ tier A */

const cssHrefs = [...html.matchAll(/<link[^>]+href="([^"]+\.css[^"]*)"/g)].map((m) => m[1]);
let cssBytes = 0;
for (const href of cssHrefs) {
  const buf = readAsset(href);
  if (buf) cssBytes += gz(buf);
}

// The inline bootstrap is render-blocking too: it is a classic <script> in
// <head>. Next's own inline flight-data scripts sit at the end of <body> and
// are not render-blocking, so only the tagged boot script counts here.
const bootMatch = html.match(/<script id="loop-boot"[^>]*>([\s\S]*?)<\/script>/);
const inlineBytes = bootMatch ? gz(Buffer.from(bootMatch[1], 'utf8')) : 0;
const tierA = cssBytes + inlineBytes;

/* ------------------------------------------------------------ tier B / C */

const scriptSrcs = [
  ...new Set(
    [...html.matchAll(/<script[^>]+src="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((u) => u.startsWith('/_next/')),
  ),
];

let tierC = 0;
const perScript = [];
for (const src of scriptSrcs) {
  const buf = readAsset(src);
  if (!buf) continue;
  const size = gz(buf);
  tierC += size;
  perScript.push({ src, size });
}

// The framework floor is measured live from a route with no first-party client
// code (/_not-found), and cross-checked against the recorded baseline. The gate
// uses the RECORDED number, so a regression in the root layout shows up as a
// Tier B increase instead of silently raising the floor.
const NOT_FOUND = join(NEXT, 'server', 'app', '_not-found.html');
let measuredFloor = 0;
if (existsSync(NOT_FOUND)) {
  const nf = readFileSync(NOT_FOUND, 'utf8');
  const srcs = [
    ...new Set(
      [...nf.matchAll(/<script[^>]+src="([^"]+)"/g)]
        .map((m) => m[1])
        .filter((u) => u.startsWith('/_next/')),
    ),
  ];
  for (const src of srcs) {
    const buf = readAsset(src);
    if (buf) measuredFloor += gz(buf);
  }
}

let floor = measuredFloor;
let baselineNote = 'no perf-baseline.json — using the measured floor';
if (existsSync(BASELINE)) {
  const base = JSON.parse(readFileSync(BASELINE, 'utf8'));
  floor = base.frameworkFloorGz ?? measuredFloor;
  baselineNote = `floor ${fmt(floor)} recorded ${base.recordedAt ?? '?'}, measured ${fmt(measuredFloor)}`;
  if (measuredFloor > 0 && Math.abs(measuredFloor - floor) > 5 * KB) {
    console.warn(
      `! framework floor drifted ${fmt(Math.abs(measuredFloor - floor))} from perf-baseline.json — re-record it and say why in the PR.`,
    );
  }
}
const tierB = Math.max(0, tierC - floor);

/* ------------------------------------------------------------ rooms */

const chunkDir = join(NEXT, 'static', 'chunks');
const allChunks = walk(chunkDir).filter((p) => p.endsWith('.js'));
const landing = new Set(scriptSrcs.map((s) => assetPath(s)));
// Chunks referenced by ANY prerendered page (the alias routes, /_not-found)
// are route entries, not room chunks; the webpack bundler also emits the
// Pages-Router runtime (framework-*, main-*, polyfills-*, webpack-*, pages/)
// which the App Router landing route never requests.
const referenced = new Set();
for (const htmlPath of walk(join(NEXT, 'server')).filter((p) => p.endsWith('.html'))) {
  const doc = readFileSync(htmlPath, 'utf8');
  for (const m of doc.matchAll(/<script[^>]+src="([^"]+)"/g)) {
    if (m[1].startsWith('/_next/')) referenced.add(assetPath(m[1]));
  }
}
const RUNTIME = /(^|[\/])(framework|main|main-app|polyfills|webpack)-[^\/]*\.js$|[\/](pages|app)[\/]/;
const lazyChunks = allChunks
  .filter((p) => !landing.has(p) && !referenced.has(p) && !RUNTIME.test(p))
  .map((p) => ({ p, size: gz(readFileSync(p)) }))
  .sort((a, b) => b.size - a.size);
const largestLazy = lazyChunks.slice(0, 5);

/* ------------------------------------------------------------ fonts / rasters */

const fontBytes = walk(join(NEXT, 'static'))
  .filter((p) => /\.(woff2?|ttf|otf|eot)$/i.test(p))
  .reduce((n, p) => n + statSync(p).size, 0);
const rasterBytes = walk(join(NEXT, 'static'))
  .filter((p) => /\.(png|jpe?g|gif|webp|avif)$/i.test(p))
  .reduce((n, p) => n + statSync(p).size, 0);

/* ------------------------------------------------------------ report */

console.log('the same four seconds — byte budgets (gzip -9, landing route)');
console.log('─'.repeat(64));
console.log(`  Tier A  render-blocking   ${fmt(tierA).padStart(10)}  / ${fmt(BUDGETS.tierA)}  hard`);
console.log(`          ├─ css            ${fmt(cssBytes).padStart(10)}  / ${fmt(BUDGETS.css)}`);
console.log(`          └─ inline boot    ${fmt(inlineBytes).padStart(10)}  / 2.0 KB`);
console.log(`  Tier B  first-party JS    ${fmt(tierB).padStart(10)}  / ${fmt(BUDGETS.tierB)}  hard`);
console.log(`  Tier C  total JS          ${fmt(tierC).padStart(10)}  / ${fmt(BUDGETS.tierC)}  soft`);
console.log(`  Document  landing HTML    ${fmt(docBytes).padStart(10)}  / ${fmt(BUDGETS.doc)}  hard`);
console.log(
  `            worst alias    ${(worstAlias ? fmt(worstAlias.size) : '—').padStart(10)}  / ${fmt(BUDGETS.doc)}  hard  (${aliasDocs.length} routes)`,
);
console.log(`  Flight    inline RSC      ${fmt(flightBytes).padStart(10)}  / ${fmt(BUDGETS.flight)}  hard`);
console.log(`  Fonts                     ${String(fontBytes).padStart(10)} B  / 0 B`);
console.log(`  Rasters                   ${String(rasterBytes).padStart(10)} B  / 0 B`);
console.log(`  Third-party origins       ${String(origins.size).padStart(10)}    / 0`);
console.log(`  ${baselineNote}`);
console.log('─'.repeat(64));
console.log(`  landing scripts: ${perScript.length}, lazy chunks: ${lazyChunks.length}`);
for (const { p, size } of largestLazy) {
  console.log(`    ${fmt(size).padStart(9)}  ${p.replace(ROOT + '/', '')}`);
}
console.log('─'.repeat(64));

if (tierA > BUDGETS.tierA) fail(`Tier A ${fmt(tierA)} over ${fmt(BUDGETS.tierA)}`);
if (inlineBytes > 2 * KB) fail(`inline bootstrap ${fmt(inlineBytes)} over 2.0 KB`);
if (cssBytes > BUDGETS.css) fail(`CSS ${fmt(cssBytes)} over ${fmt(BUDGETS.css)}`);
if (tierB > BUDGETS.tierB) fail(`Tier B ${fmt(tierB)} over ${fmt(BUDGETS.tierB)}`);
if (docBytes > BUDGETS.doc) fail(`the document is ${fmt(docBytes)}, over ${fmt(BUDGETS.doc)}`);
if (flightBytes > BUDGETS.flight) {
  fail(`the inline flight payload is ${fmt(flightBytes)}, over ${fmt(BUDGETS.flight)}`);
}
if (tierC > BUDGETS.tierC) console.warn(`! Tier C ${fmt(tierC)} over the soft ${fmt(BUDGETS.tierC)}`);
if (fontBytes > 0) fail(`${fontBytes} font bytes shipped — the budget is zero`);
if (rasterBytes > 0) fail(`${rasterBytes} raster bytes shipped — the budget is zero`);
if (worstAlias && worstAlias.size > BUDGETS.doc) {
  fail(`the alias document ${worstAlias.p.replace(ROOT + '/', '')} is ${fmt(worstAlias.size)}, over ${fmt(BUDGETS.doc)}`);
}
for (const origin of origins) fail(`third-party origin fetched by the document: ${origin} — the budget is zero`);

// Every figure's lazy chunk must be <= 2 KB gz (§H.1) — EVERY one, not the
// five that happen to be printed above. An empty lazy set is reported, not
// failed: the ceiling is what is enforced, and nothing may cross it.
const overFigure = lazyChunks.filter((c) => c.size > BUDGETS.figure);
console.log(`  lazy chunks over ${fmt(BUDGETS.figure)}: ${overFigure.length} of ${lazyChunks.length}`);
for (const c of overFigure) {
  fail(`lazy chunk ${c.p.replace(ROOT + '/', '')} is ${fmt(c.size)}, over the ${fmt(BUDGETS.figure)} figure ceiling`);
}

if (process.exitCode) {
  console.error('\n✗ byte budget FAILED');
} else {
  console.log('\n✓ byte budgets OK');
}
