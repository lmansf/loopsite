#!/usr/bin/env node
/**
 * scripts/bundle-budget.mjs — the byte gate.
 *
 * Spec: design/05-build-spec.md §F.1 ("Budgets"), §H.1.
 *
 *   Tier A  render-blocking (the stylesheet + the inline bootstrap)  <= 14 KB gz, HARD
 *   Tier B  first-party JS on the landing route, excluding the
 *           React/Next runtime floor                                 <= 90 KB gz, HARD
 *   Tier C  total JS transferred on the landing route                <= 230 KB gz, soft
 *   CSS     total                                                    <= 14 KB gz
 *   Fonts   0 bytes.   Raster images   0 bytes.
 *   Rooms   each room's lazy chunk <= its declared budgetKb
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
const NEXT = join(ROOT, '.next');
const HTML = join(NEXT, 'server', 'app', 'index.html');
const BASELINE = join(ROOT, 'perf-baseline.json');

const KB = 1024;
const BUDGETS = {
  tierA: 14 * KB,
  tierB: 90 * KB,
  tierC: 230 * KB,
  css: 14 * KB,
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

const html = readFileSync(HTML, 'utf8');

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
const lazyChunks = allChunks.filter((p) => !landing.has(p) && !referenced.has(p) && !RUNTIME.test(p));
const largestLazy = lazyChunks
  .map((p) => ({ p, size: gz(readFileSync(p)) }))
  .sort((a, b) => b.size - a.size)
  .slice(0, 5);

/* ------------------------------------------------------------ fonts / rasters */

const fontBytes = walk(join(NEXT, 'static'))
  .filter((p) => /\.(woff2?|ttf|otf|eot)$/i.test(p))
  .reduce((n, p) => n + statSync(p).size, 0);
const rasterBytes = walk(join(NEXT, 'static'))
  .filter((p) => /\.(png|jpe?g|gif|webp|avif)$/i.test(p))
  .reduce((n, p) => n + statSync(p).size, 0);

/* ------------------------------------------------------------ report */

console.log('LOOP — byte budgets (gzip -9, landing route)');
console.log('─'.repeat(64));
console.log(`  Tier A  render-blocking   ${fmt(tierA).padStart(10)}  / ${fmt(BUDGETS.tierA)}  hard`);
console.log(`          ├─ css            ${fmt(cssBytes).padStart(10)}  / ${fmt(BUDGETS.css)}`);
console.log(`          └─ inline boot    ${fmt(inlineBytes).padStart(10)}  / 2.0 KB`);
console.log(`  Tier B  first-party JS    ${fmt(tierB).padStart(10)}  / ${fmt(BUDGETS.tierB)}  hard`);
console.log(`  Tier C  total JS          ${fmt(tierC).padStart(10)}  / ${fmt(BUDGETS.tierC)}  soft`);
console.log(`  Fonts                     ${String(fontBytes).padStart(10)} B  / 0 B`);
console.log(`  Rasters                   ${String(rasterBytes).padStart(10)} B  / 0 B`);
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
if (tierC > BUDGETS.tierC) console.warn(`! Tier C ${fmt(tierC)} over the soft ${fmt(BUDGETS.tierC)}`);
if (fontBytes > 0) fail(`${fontBytes} font bytes shipped — the budget is zero`);
if (rasterBytes > 0) fail(`${rasterBytes} raster bytes shipped — the budget is zero`);

// Every room's lazy chunk must be within its declared budgetKb. Turbopack does
// not name chunks after their source module, so this asserts the ceiling: no
// lazy chunk may exceed the largest declared room budget.
const REGISTRY = readFileSync(join(ROOT, 'src', 'sections', 'registry.ts'), 'utf8');
const slugs = [...REGISTRY.matchAll(/^\/\/ SLOT \S+\s+(\S+)$/gm)].map((m) => m[1]);
const budgets = {};
for (const slug of slugs) {
  const idx = join(ROOT, 'src', 'sections', slug, 'index.ts');
  if (!existsSync(idx)) continue;
  const m = readFileSync(idx, 'utf8').match(/budgetKb:\s*(\d+)/);
  if (m) budgets[slug] = Number(m[1]);
}
const maxRoom = Math.max(...Object.values(budgets), 0);
const over = largestLazy.filter((c) => c.size > maxRoom * KB);
console.log(`  room budgets: ${Object.entries(budgets).map(([k, v]) => `${k}:${v}`).join(' ')}`);
console.log(`  largest declared room budget: ${maxRoom} KB`);
for (const c of over) {
  fail(`lazy chunk ${c.p.replace(ROOT + '/', '')} is ${fmt(c.size)}, over the ${maxRoom} KB room ceiling`);
}

if (process.exitCode) {
  console.error('\n✗ byte budget FAILED');
} else {
  console.log('\n✓ byte budgets OK');
}
