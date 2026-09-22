/**
 * tests/rooms/growth.spec.ts — GROWTH (§D.7). Owned by WP5.
 *
 * Asserts, beyond the template minimum:
 *   - the segment cap holds for EVERY node arrangement, generation and tier
 *     (pure, against the builder itself, with 24-node arrangements);
 *   - a node drag rebuilds the fern on the very next frame, in well under one;
 *   - at 24 nodes and the generation cap the built fern is within the cap;
 *   - the reduced-motion variant is a complete, static, non-uniform still.
 */

import { expect, ringGeometry, test } from '../fixtures';
import { mulberry32 } from '../../src/lib/rng';
import {
  GEN_CAP,
  GEN_CAP_LOW,
  SEGMENT_CAP,
  SEGMENT_CAP_LOW,
  buildFern,
  heightFor,
  paramsFor,
  planExpansion,
  segmentCount,
  sortByAngle,
} from '../../src/sections/growth/logic';
import type { RingNode } from '../../src/lib/types';

const SLUG = 'growth';
const ROOT = '[data-room="growth"]';

function randomNodes(rnd: () => number, count: number): RingNode[] {
  const out: RingNode[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: `n${i}`,
      a: Math.round(rnd() * 256) / 256,
      r: Math.floor(rnd() * 16),
      v: Math.floor(rnd() * 16),
      born: 0,
    });
  }
  return out;
}

async function variance(page: import('@playwright/test').Page, id = 'loop-room'): Promise<number> {
  return page.evaluate((canvasId) => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let sum = 0;
    let sumSq = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 4 * 97) {
      const lum = (data[i]! + data[i + 1]! + data[i + 2]!) / 3;
      sum += lum;
      sumSq += lum * lum;
      n++;
    }
    const mean = sum / n;
    return sumSq / n - mean * mean;
  }, id);
}

async function nextFrame(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
}

/* ------------------------------------------------------------ pure */

test(`${SLUG}: the segment cap holds for every arrangement, generation and tier`, () => {
  const rnd = mulberry32(0x9e3779b9);
  const arrangements: RingNode[][] = [];
  for (let i = 0; i < 40; i++) arrangements.push(randomNodes(rnd, 24));
  arrangements.push([]);
  arrangements.push(randomNodes(rnd, 1));
  // every node at the extremes: the widest angles and the longest branches
  arrangements.push(
    Array.from({ length: 24 }, (_, i) => ({ id: `x${i}`, a: i / 24, r: 15, v: 15, born: 0 })),
  );
  arrangements.push(
    Array.from({ length: 24 }, (_, i) => ({ id: `y${i}`, a: i / 24, r: 0, v: 0, born: 0 })),
  );

  for (const [cap, genCap] of [
    [SEGMENT_CAP, GEN_CAP],
    [SEGMENT_CAP_LOW, GEN_CAP_LOW],
  ] as const) {
    for (const nodes of arrangements) {
      const sorted = sortByAngle(nodes);
      let last = 0;
      for (let gen = 1; gen <= genCap; gen++) {
        const fern = buildFern({
          gen,
          params: paramsFor(sorted, gen),
          baseX: 0,
          baseY: 0,
          heading: 0,
          height: heightFor(gen, genCap, 351),
          cap,
          rnd: mulberry32(gen),
        });
        expect(fern.count, `gen ${gen} cap ${cap}`).toBeLessThanOrEqual(cap);
        expect(fern.count).toBe(segmentCount(gen, cap));
        expect(fern.count, 'a generation never has fewer segments than the last').toBeGreaterThanOrEqual(last);
        last = fern.count;
        // every written segment is finite
        for (let i = 0; i < fern.count * 4; i++) expect(Number.isFinite(fern.segs[i])).toBe(true);
      }
      // at the cap the fern is genuinely at the cap: the budget is spent
      const atCap = segmentCount(genCap, cap);
      expect(atCap).toBeGreaterThan(cap * 0.95);
      expect(atCap).toBeLessThanOrEqual(cap);
    }
  }

  // the plan itself: totals never exceed the cap and a partial level is even
  const plan = planExpansion(GEN_CAP, SEGMENT_CAP);
  for (let l = 0; l <= GEN_CAP; l++) expect(plan.N[l]).toBeLessThanOrEqual(SEGMENT_CAP);
  expect(plan.N[5]).toBe(3125);
});

/* ------------------------------------------------------------ browser */

test(`${SLUG}: the room mounts, draws the fern, and reports section_viewed`, async ({ page }) => {
  const seen: string[] = [];
  await page.route('**/api/beacon', async (route) => {
    const body = route.request().postData() ?? '';
    try {
      const parsed = JSON.parse(body) as { events?: Array<{ n: string; d?: { section?: string } }> };
      for (const e of parsed.events ?? []) {
        if (e.n === 'section_viewed' && e.d?.section) seen.push(e.d.section);
      }
    } catch {
      /* not our payload */
    }
    await route.fulfill({ status: 204, body: '' });
  });

  await page.goto(`/?s=${SLUG}`);
  await page.waitForSelector('#stage');
  await expect(page.locator('#loop-room')).toHaveAttribute('aria-label', /\S/);
  await expect(page.locator(`.room-shell[data-slug="${SLUG}"] .hook`)).toHaveText('one more generation');
  await expect(page.locator(`.room-shell[data-slug="${SLUG}"] .next-link`)).toHaveAttribute('href', '/?s=orbit');

  // the fern is built and within its cap before a single tap
  const root = page.locator(ROOT);
  await expect(root).toHaveAttribute('data-growth-gen', /\d/);
  const cap = Number(await root.getAttribute('data-growth-cap'));
  const segs = Number(await root.getAttribute('data-growth-segments'));
  expect(segs).toBeGreaterThan(0);
  expect(segs).toBeLessThanOrEqual(cap);

  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  expect(await variance(page), 'the room layer must not be a uniform image').toBeGreaterThan(1);
  expect(await variance(page, 'loop-bg'), 'the background layer carries the field').toBeGreaterThan(0);

  // flush the beacon: pagehide is one of its three flush triggers
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.waitForTimeout(300);
  expect(seen).toContain(SLUG);
});

test(`${SLUG}: a node drag rebuilds the fern on the next frame`, async ({ page }) => {
  await page.goto(`/?s=${SLUG}`);
  await page.waitForSelector('#stage');
  const g = await ringGeometry(page);
  const root = page.locator(ROOT);

  // place one node at 3 o'clock
  const x0 = g.cx + g.r;
  const y0 = g.cy;
  await page.mouse.click(x0, y0);
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '1');
  await nextFrame(page);
  const hashBefore = await root.getAttribute('data-growth-hash');
  expect(hashBefore).toMatch(/\S/);

  // grab it and drag it around the ring, one pointer step at a time
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  let previous = hashBefore;
  for (let i = 1; i <= 6; i++) {
    const turn = 0.25 + i * 0.03;
    const x = g.cx + g.r * Math.sin(turn * Math.PI * 2);
    const y = g.cy - g.r * Math.cos(turn * Math.PI * 2);
    await page.mouse.move(x, y);
    await nextFrame(page);
    const hash = await root.getAttribute('data-growth-hash');
    expect(hash, `step ${i}: the fern follows the drag within one frame`).not.toBe(previous);
    const buildMs = Number(await root.getAttribute('data-growth-build-ms'));
    expect(buildMs, 'a rebuild costs well under one frame').toBeLessThan(16);
    const segs = Number(await root.getAttribute('data-growth-segments'));
    expect(segs).toBeLessThanOrEqual(Number(await root.getAttribute('data-growth-cap')));
    previous = hash;
  }
  await page.mouse.up();
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '1');
});

test(`${SLUG}: at 24 nodes and the generation cap the fern stays within its segment cap`, async ({
  page,
}) => {
  await page.goto(`/?s=${SLUG}`);
  await page.waitForSelector('#stage');
  await page.locator('#stage').focus();
  for (let i = 0; i < 24; i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(45);
  }
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '24');

  // gentle mode draws the fern at its final generation at once
  await page.locator('[data-control="motion"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
  const root = page.locator(ROOT);
  await expect(root).toHaveAttribute('data-growth-gen', String(GEN_CAP));
  const cap = Number(await root.getAttribute('data-growth-cap'));
  const segs = Number(await root.getAttribute('data-growth-segments'));
  expect(cap).toBe(SEGMENT_CAP);
  expect(segs).toBeLessThanOrEqual(cap);
  expect(segs, 'the budget is actually spent at the cap').toBeGreaterThan(cap * 0.95);
  expect(Number(await root.getAttribute('data-growth-build-ms'))).toBeLessThan(16);
  expect(await variance(page)).toBeGreaterThan(1);
});

test(`${SLUG}: never mutates the visitor's node set`, async ({ page }) => {
  await page.goto('/');
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '2');
  await page.locator('#stage').press('7');
  await expect(page.locator(`.room-shell[data-slug="${SLUG}"]`)).toHaveAttribute('data-active', 'true');
  await page.waitForTimeout(900);
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '2');
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test(`${SLUG}: the calm variant is a complete, static, non-uniform still`, async ({ page }) => {
    await page.goto(`/?s=${SLUG}`);
    await page.waitForSelector('html[data-motion="reduce"]');
    await page.waitForSelector(`.room-shell[data-slug="${SLUG}"][data-active="true"]`);
    const root = page.locator(ROOT);
    // drawn once at its final generation, fully formed
    await expect(root).toHaveAttribute('data-growth-gen', String(GEN_CAP));
    await page.waitForTimeout(600);
    expect(await variance(page)).toBeGreaterThan(1);
    // and still: two samples half a second apart are byte-identical
    const digest = () =>
      page.evaluate(() => {
        const canvas = document.getElementById('loop-room') as HTMLCanvasElement;
        const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
        let h = 0;
        for (let i = 0; i < data.length; i += 4 * 31) h = (h * 31 + data[i]! + data[i + 1]! * 7) >>> 0;
        return h;
      });
    const a = await digest();
    await page.waitForTimeout(500);
    const b = await digest();
    expect(b).toBe(a);
  });
});
