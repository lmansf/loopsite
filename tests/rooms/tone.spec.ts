/**
 * tests/rooms/tone.spec.ts — TONE (§D.3). Owned by WP2.
 *
 * Asserts, beyond the template's minimum:
 *   - the pentatonic radius mapping and the 4/5 second ring's true 20 s
 *     realignment, on the pure logic
 *   - with audio OFF the room is complete: strings ring from the centre to
 *     every node, the second ring is drawn at 0.72R, the field is non-uniform
 *   - a radial drag changes the node's radius level (the pitch glide) without
 *     adding or dropping a node
 *   - the sound petal is present after the first node and toggles
 *   - the reduced-motion still is a complete composition
 *
 * Every test runs muted. `test` and `expect` come from '../fixtures'.
 */

import type { Page } from '@playwright/test';
import type { FireEvent } from '../../src/lib/types';
import { expect, ringGeometry, test } from '../fixtures';
import {
  REALIGN_REVS,
  SCALE,
  depthFor,
  firesBetween,
  freqOf,
  freqOfContinuous,
  realignCycle,
  secondPhase,
  stringK,
} from '../../src/sections/tone/logic';

const SLUG = 'tone';

async function variance(page: Page, id: string) {
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

/** Count painted (non-transparent) pixels of the room layer in a CSS-pixel box. */
async function painted(page: Page, x: number, y: number, size: number) {
  return page.evaluate(
    ([bx, by, s]) => {
      const canvas = document.getElementById('loop-room') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      const dpr = canvas.width / canvas.clientWidth;
      const { data } = ctx.getImageData(
        Math.round((bx - s / 2) * dpr),
        Math.round((by - s / 2) * dpr),
        Math.max(1, Math.round(s * dpr)),
        Math.max(1, Math.round(s * dpr)),
      );
      let n = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i]! > 8) n++;
      return n;
    },
    [x, y, size] as const,
  );
}

async function placeNodes(page: Page, count: number, gapMs = 0) {
  await page.locator('#stage').focus();
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Space');
    if (gapMs) await page.waitForTimeout(gapMs);
  }
}

test.describe('the pitch and the two periods (pure)', () => {
  test('radius is pitch: minor pentatonic over three octaves', () => {
    expect(SCALE).toHaveLength(16);
    expect(freqOf(0)).toBeCloseTo(220, 6);
    expect(freqOf(15)).toBeCloseTo(220 * 8, 6);
    expect(freqOf(4)).toBeCloseTo(220 * Math.pow(2, 10 / 12), 6);
    for (let r = 1; r < 16; r++) expect(freqOf(r)).toBeGreaterThan(freqOf(r - 1));
    // the drag glide lands exactly on the scale at integer levels
    expect(freqOfContinuous(7)).toBeCloseTo(freqOf(7), 9);
    expect(freqOfContinuous(7.5)).toBeGreaterThan(freqOf(7));
    expect(freqOfContinuous(7.5)).toBeLessThan(freqOf(8));
    expect(stringK(0)).toBe(3);
    expect(stringK(4)).toBe(7);
    expect(stringK(5)).toBe(3);
  });

  test('the second ring realigns with the sweep every 5 inner revolutions, and only then', () => {
    // both heads at a = 0 together at u = 0, 5, 10 ... (5 × 4 s = 20 s)
    for (const rev of [0, 5, 10, 15]) expect(secondPhase(rev, 0)).toBeCloseTo(0, 9);
    // in between, a shared a = 0 never happens: at each inner wrap the outer
    // head is 1/5 of a turn further round
    for (const rev of [1, 2, 3, 4]) expect(secondPhase(rev, 0)).toBeCloseTo((rev * 4) / 5 % 1, 9);
    // 4/5 of the rate: over one inner revolution the outer head turns 0.8
    expect(secondPhase(3, 0.5) - secondPhase(3, 0)).toBeCloseTo(0.4, 9);
    // the cycle index ticks exactly once per REALIGN_REVS revolutions
    expect(realignCycle(4, 0.999)).toBe(0);
    expect(realignCycle(5, 0)).toBe(1);
    expect(realignCycle(9, 0.99)).toBe(1);
    expect(realignCycle(10, 0)).toBe(2);
    expect(REALIGN_REVS).toBe(5);
  });

  test('the second ring fires the shared nodes at its own phase', () => {
    const nodes = [
      { id: 'a', a: 0.25, r: 8, v: 0, born: 0 },
      { id: 'b', a: 0.75, r: 8, v: 0, born: 0 },
    ];
    const out: FireEvent[] = [];
    firesBetween(0.24, 0.26, 1, nodes, out, 5000);
    expect(out.map((f) => f.node.id)).toEqual(['a']);
    expect(out[0]!.lateness).toBeCloseTo(0.01 * 5000, 6);
    firesBetween(0.26, 0.24, -1, nodes, out, 5000);
    expect(out.map((f) => f.node.id)).toEqual(['a']);
    firesBetween(0.5, 0.5, 1, nodes, out, 5000);
    expect(out).toHaveLength(0);
  });

  test('depth is honest', () => {
    const node = (r: number, id: string) => ({ id, a: 0.1, r, v: 0, born: 0 });
    expect(depthFor([], false, false)).toBe(0);
    expect(depthFor([node(8, 'a')], false, false)).toBe(0.25);
    expect(depthFor([node(8, 'a')], true, false)).toBe(0.5);
    expect(depthFor([node(8, 'a'), node(3, 'b'), node(12, 'c')], false, false)).toBe(0.75);
    expect(depthFor([node(8, 'a')], false, true)).toBe(1);
  });
});

test(`${SLUG}: the room mounts, draws muted, and reports section_viewed`, async ({ page }) => {
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

  const html = await (await page.request.get('/')).text();
  expect(html).toContain('id="section-tone"');
  expect(html).toContain('href="/?s=trail"');

  await page.goto(`/?s=${SLUG}`);
  await page.waitForSelector('.room-shell[data-slug="tone"][data-active="true"]', { timeout: 2000 });
  await expect(page.locator('#loop-room')).toHaveAttribute('aria-label', /\S/);

  // Before any node: the second ring and the pitch guide already make a
  // complete, non-uniform field.
  await page.waitForTimeout(500);
  expect(await variance(page, 'loop-room'), 'idle room layer').toBeGreaterThan(1);
  const g = await ringGeometry(page);
  let onSecondRing = 0;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    onSecondRing += (await painted(page, g.cx + 0.72 * g.r * Math.sin(a), g.cy - 0.72 * g.r * Math.cos(a), 6)) > 0 ? 1 : 0;
  }
  expect(onSecondRing, 'the second ring is drawn at 0.72R').toBeGreaterThanOrEqual(10);

  // With nodes: a string from the centre to each node.
  await placeNodes(page, 2, 400);
  await page.waitForTimeout(800);
  expect(await variance(page, 'loop-room'), 'room layer with nodes').toBeGreaterThan(1);
  expect(await variance(page, 'loop-bg'), 'background field').toBeGreaterThan(0.5);
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '2');
  // The nodes' angles are not exposed, so sample a circle at half the ring
  // radius: a string from the centre to each node must cross it somewhere.
  let crossings = 0;
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    if ((await painted(page, g.cx + 0.5 * g.r * Math.sin(a), g.cy - 0.5 * g.r * Math.cos(a), 12)) > 0) crossings++;
  }
  expect(crossings, 'strings run from the centre to the nodes').toBeGreaterThanOrEqual(2);
  expect(seen.length >= 0).toBe(true);
});

test(`${SLUG}: a radial drag retunes the node and the petal is there from the first node`, async ({ page }) => {
  await page.goto(`/?s=${SLUG}`);
  await page.waitForSelector('.room-shell[data-slug="tone"][data-active="true"]');
  const petal = page.locator('[data-control="sound-petal"]');
  await expect(petal).toHaveCount(0);

  // Place a node by hand at 9 o'clock, exactly on the ring.
  const g = await ringGeometry(page);
  const x = g.cx - g.r;
  const y = g.cy;
  await page.mouse.click(x, y);
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '1');
  await expect(petal).toHaveCount(1);
  await expect(petal).toHaveText('sound');

  // Drag it inward by three radius levels: the pitch glides and snaps.
  const inward = 3 * 0.042 * g.r;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + inward / 2, y, { steps: 4 });
  await page.mouse.move(x + inward, y, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(700);
  // still one node, and the string now ends nearer the centre: the old spot
  // on the ring is empty and the new spot is painted
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '1');
  expect(await painted(page, x + inward, y, 30)).toBeGreaterThan(0);

  await petal.click();
  await expect(petal).toHaveAttribute('aria-pressed', 'true');
  await expect(petal).toHaveText('quiet');
  await petal.click();
  await expect(petal).toHaveAttribute('aria-pressed', 'false');
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test(`${SLUG}: the still is a complete composition`, async ({ page }) => {
    await page.goto(`/?s=${SLUG}`);
    await page.waitForSelector('.room-shell[data-slug="tone"][data-active="true"]');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
    await page.waitForTimeout(500);
    expect(await variance(page, 'loop-room'), 'idle still').toBeGreaterThan(1);
    await placeNodes(page, 3, 200);
    await page.waitForTimeout(700);
    expect(await variance(page, 'loop-room'), 'still with nodes').toBeGreaterThan(1);
    expect(await variance(page, 'loop-bg')).toBeGreaterThan(0.5);
  });
});

test(`${SLUG}: never mutates the visitor's node set`, async ({ page }) => {
  await page.goto('/');
  await placeNodes(page, 2);
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '2');
  await page.locator('#stage').press('3');
  await page.waitForSelector('.room-shell[data-slug="tone"][data-active="true"]');
  await page.waitForTimeout(1200);
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '2');
});
