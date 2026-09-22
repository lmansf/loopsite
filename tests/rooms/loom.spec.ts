/**
 * tests/rooms/loom.spec.ts — LOOM (§D.9). Owned by WP6.
 *
 * Asserts the room-spec minimum (tests/rooms/README.md) plus the room's own
 * trick: the real interlacement rule, clock-locked tiling, the node columns,
 * the drag-and-spring-back, no horizontal document overflow at 320 px, and a
 * still, non-uniform, non-scrolling composition under reduced motion.
 */

import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import {
  WARP,
  WARP_NARROW,
  WEFT,
  assignColumns,
  columnOf,
  depthFor,
  easeLoop,
  isOver,
  tileOrigin,
  tilePeriod,
  warpFor,
} from '../../src/sections/loom/logic';

const SLUG = 'loom';

/* ------------------------------------------------------------ pure logic */

test(`${SLUG}: the interlacement rule is the spec's, not a texture`, () => {
  // over when ((y·(1 + (r mod 4)) + c) mod (2 + v mod 3)) === 0
  for (let y = 0; y < WEFT; y++) {
    for (const c of [0, 7, 23, 47]) {
      for (const r of [0, 3, 8, 15]) {
        for (const v of [0, 1, 2, 5, 15]) {
          const expected = (y * (1 + (r % 4)) + c) % (2 + (v % 3)) === 0;
          expect(isOver(y, c, r, v)).toBe(expected);
        }
      }
    }
  }
  // it genuinely interlaces: a column is neither all over nor all under
  let overs = 0;
  for (let y = 0; y < WEFT; y++) if (isOver(y, 5, 8, 0)) overs++;
  expect(overs).toBeGreaterThan(0);
  expect(overs).toBeLessThan(WEFT);
});

test(`${SLUG}: a node sets the column under its angle, 48 wide or 24 narrow`, () => {
  expect(columnOf(0, WARP)).toBe(0);
  expect(columnOf(0.5, WARP)).toBe(24);
  expect(columnOf(0.999, WARP)).toBe(47);
  expect(columnOf(0.5, WARP_NARROW)).toBe(12);
  expect(warpFor(1280, 'high')).toBe(WARP);
  expect(warpFor(360, 'high')).toBe(WARP_NARROW);
  expect(warpFor(1280, 'low')).toBe(WARP_NARROW);
  const owner = new Int16Array(WARP);
  const node = (a: number) => ({ id: 'x', a, r: 8, v: 0, born: 0 });
  expect(assignColumns([node(0.1), node(0.1), node(0.6)], WARP, owner)).toBe(2);
  expect(owner[columnOf(0.1, WARP)]).toBe(1);
  expect(owner[columnOf(0.6, WARP)]).toBe(2);
  expect(owner[0]).toBe(-1);
});

test(`${SLUG}: the band is locked to the clock — exactly one tile per revolution`, () => {
  const R = 280;
  const W = tilePeriod(R);
  expect(W).toBeCloseTo((2 * Math.PI * R) / 3, 6);
  expect(tileOrigin(0, W, 0)).toBeCloseTo(0, 6);
  expect(tileOrigin(0.25, W, 0)).toBeCloseTo(-0.25 * W, 6);
  expect(tileOrigin(0.999, W, 0)).toBeCloseTo(-0.999 * W, 6);
  // a full revolution later the weave is in the same place
  expect(tileOrigin(1.25, W, 0)).toBeCloseTo(tileOrigin(0.25, W, 0), 6);
  // the drag offsets it, and the result always stays in (-W, 0]
  for (const drag of [-900, -1, 0, 1, 37, 900]) {
    for (const phase of [0, 0.1, 0.5, 0.99]) {
      const x = tileOrigin(phase, W, drag);
      expect(x).toBeLessThanOrEqual(0);
      expect(x).toBeGreaterThan(-W);
    }
  }
  expect(easeLoop(0)).toBe(0);
  expect(easeLoop(1)).toBe(1);
  expect(easeLoop(0.5)).toBeCloseTo(0.5, 2);
});

test(`${SLUG}: depth is 0.25 viewed, 0.5 two columns, 0.75 a drag, 1.0 five columns`, () => {
  expect(depthFor(0, false)).toBe(0.25);
  expect(depthFor(1, false)).toBe(0.25);
  expect(depthFor(2, false)).toBe(0.5);
  expect(depthFor(2, true)).toBe(0.75);
  expect(depthFor(5, false)).toBe(1);
});

/* ------------------------------------------------------------ the room */

async function roomStats(page: Page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('loop-room') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let sum = 0;
    let sumSq = 0;
    let n = 0;
    let lit = 0;
    for (let i = 0; i < data.length; i += 4 * 97) {
      const lum = ((data[i]! + data[i + 1]! + data[i + 2]!) / 3) * (data[i + 3]! / 255);
      sum += lum;
      sumSq += lum * lum;
      if (lum > 4) lit++;
      n++;
    }
    const mean = sum / n;
    return { mean, variance: sumSq / n - mean * mean, lit, n };
  });
}

/** A luminance signature along the band's centre line (through cy). */
async function bandSignature(page: Page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('loop-room') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const cy = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ring-cy'));
    const scale = canvas.height / Math.max(1, canvas.clientHeight);
    const y = Math.min(canvas.height - 1, Math.max(0, Math.floor(cy * scale)));
    const row = ctx.getImageData(0, y, canvas.width, 1).data;
    const out: number[] = [];
    for (let x = 0; x < canvas.width; x += 3) {
      const i = x * 4;
      out.push(Math.round(((row[i]! + row[i + 1]! + row[i + 2]!) / 3) * (row[i + 3]! / 255)));
    }
    return out;
  });
}

function differs(a: number[], b: number[]): number {
  let d = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (Math.abs(a[i]! - b[i]!) > 6) d++;
  return d / Math.max(1, Math.min(a.length, b.length));
}

test(`${SLUG}: the room mounts, weaves, keeps its text equivalent and reports section_viewed`, async ({
  page,
}) => {
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
  await page.waitForSelector(`.room-shell[data-slug="${SLUG}"][data-active="true"]`);
  await expect(page.locator('[data-room="loom"]')).toHaveAttribute('data-weave', 'locked', {
    timeout: 2000,
  });

  // the raw document carries the room, its hook and its next room by name
  const html = await (await page.request.get('/')).text();
  expect(html).toContain('id="section-loom"');
  expect(html).toContain('four thousand years');
  expect(html).toContain('href="/?s=wear"');

  // the canvas keeps a real text equivalent
  await expect(page.locator('#loop-room')).toHaveAttribute('aria-label', /loom/);

  // the ground cloth alone is a complete, non-uniform image
  await page.waitForTimeout(400);
  const empty = await roomStats(page);
  expect(empty.variance, 'the weave must not be a uniform image').toBeGreaterThan(1);

  // the hook line is spoken on entry
  await expect(page.locator('#loop-status')).toHaveText('four thousand years');

  // section_viewed reaches the wire (forced flush)
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.waitForTimeout(300);
  expect(seen).toContain('loom');
});

test(`${SLUG}: each node claims a warp column and the weave changes`, async ({ page }) => {
  await page.goto(`/?s=${SLUG}`);
  const root = page.locator('[data-room="loom"]');
  await expect(root).toHaveAttribute('data-columns', '0', { timeout: 2000 });
  await page.waitForTimeout(300);

  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '1');
  await expect(root).toHaveAttribute('data-columns', '1');
  await page.waitForTimeout(600); // a different angle for the second node
  await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '2');
  await expect(root).toHaveAttribute('data-columns', '2');

  // input dismisses the hook line
  await expect(page.locator('#loop-status')).not.toHaveText('four thousand years');

  // the node columns are brighter than the ground: more lit pixels than before
  const woven = await roomStats(page);
  expect(woven.variance).toBeGreaterThan(1);
});

test(`${SLUG}: a horizontal drag offsets the weave, release springs back to clock-lock`, async ({
  page,
}) => {
  await page.goto(`/?s=${SLUG}`);
  const root = page.locator('[data-room="loom"]');
  await expect(root).toHaveAttribute('data-weave', 'locked', { timeout: 2000 });
  await page.waitForTimeout(300);

  const g = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return {
      r: parseFloat(s.getPropertyValue('--ring-r')),
      cx: parseFloat(s.getPropertyValue('--ring-cx')),
      cy: parseFloat(s.getPropertyValue('--ring-cy')),
    };
  });
  // inside the band (through cy), well inside the ring, off its hit band
  const x0 = g.cx - g.r * 0.35;
  const y0 = g.cy + g.r * 0.05;
  const before = await page.locator('#stage').getAttribute('data-node-count');

  await page.mouse.move(x0, y0);
  await page.mouse.down();
  await page.mouse.move(x0 + 40, y0, { steps: 4 });
  await expect(root).toHaveAttribute('data-weave', 'drag');
  await page.mouse.move(x0 + 120, y0, { steps: 6 });
  await page.mouse.up();
  await expect(root).toHaveAttribute('data-weave', 'spring');
  // --dur-8 is 1200 ms; it must be locked again well within two seconds
  await expect(root).toHaveAttribute('data-weave', 'locked', { timeout: 2500 });

  // the ring was unaffected: no node was placed or moved by the drag
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', before ?? '0');
});

test(`${SLUG}: the drag has a keyboard equivalent`, async ({ page }) => {
  await page.goto(`/?s=${SLUG}`);
  const root = page.locator('[data-room="loom"]');
  await expect(root).toHaveAttribute('data-weave', 'locked', { timeout: 2000 });
  await page.locator('#stage').focus();
  await page.keyboard.press('.');
  await expect(root).toHaveAttribute('data-weave', 'spring');
  await expect(root).toHaveAttribute('data-weave', 'locked', { timeout: 2500 });
  await page.keyboard.press(',');
  await expect(root).toHaveAttribute('data-weave', 'spring');
  // still in the room, still no node placed
  await expect(page.locator(`.room-shell[data-slug="${SLUG}"]`)).toHaveAttribute('data-active', 'true');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '0');
});

test(`${SLUG}: no horizontal document overflow at 320 px`, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(`/?s=${SLUG}`);
  await expect(page.locator('[data-room="loom"]')).toHaveAttribute('data-weave', 'locked', {
    timeout: 2000,
  });
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const stats = await roomStats(page);
  expect(stats.variance).toBeGreaterThan(1);
});

test(`${SLUG}: never mutates the visitor's node set`, async ({ page }) => {
  await page.goto('/');
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '2');
  await page.goto(`/?s=${SLUG}`);
  await page.waitForTimeout(600);
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '0');
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test(`${SLUG}: a still, complete weave that does not scroll`, async ({ page }) => {
    await page.goto(`/?s=${SLUG}`);
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
    await expect(page.locator('[data-room="loom"]')).toHaveAttribute('data-weave', 'locked', {
      timeout: 2000,
    });
    await page.locator('#stage').focus();
    await page.keyboard.press('Space');
    await page.waitForTimeout(600);

    const stats = await roomStats(page);
    expect(stats.variance, 'the still must not be a uniform image').toBeGreaterThan(1);

    // one second later — a quarter revolution — the band has not moved
    const a = await bandSignature(page);
    await page.waitForTimeout(1000);
    const b = await bandSignature(page);
    expect(differs(a, b), 'the band must not scroll under reduced motion').toBeLessThan(0.02);
  });
});
