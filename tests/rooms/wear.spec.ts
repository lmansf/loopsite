/**
 * tests/rooms/wear.spec.ts — WEAR (§D.10). Owned by WP6.
 *
 * Asserts the room-spec minimum (tests/rooms/README.md) plus the thesis: vigor
 * decays by 0.94 per revolution and floors at 0.22; the room dims but never
 * removes content, never shows a timer, never punishes; `it's getting tired`
 * appears once below 0.6; a one-level nudge (↑) revives it fully and says
 * `better.`; under reduced motion the decay is expressed as alpha only.
 */

import type { Page } from '@playwright/test';
import { SWEEP_MS, expect, test } from '../fixtures';
import {
  DECAY,
  FLOOR,
  RESTED,
  REVIVED,
  TIRED_AT,
  decayed,
  depthFor,
  lowpassHz,
  audioGain,
  parseRgb,
  reviveCurve,
  revolutionsUntilTired,
  ringAlpha,
  trailTau,
} from '../../src/sections/wear/logic';

const SLUG = 'wear';
const TIRED = "it's getting tired";
const BETTER = 'better.';

/* ------------------------------------------------------------ pure logic */

test(`${SLUG}: vigor decays by 0.94 per revolution and floors at 0.22`, () => {
  expect(decayed(1)).toBeCloseTo(DECAY, 6);
  expect(decayed(decayed(1))).toBeCloseTo(DECAY * DECAY, 6);
  let v = RESTED;
  for (let i = 0; i < 200; i++) v = decayed(v);
  expect(v).toBe(FLOOR);
  // the floor is a floor: doing nothing forever never reaches zero
  expect(decayed(FLOOR)).toBe(FLOOR);
  expect(FLOOR).toBeGreaterThan(0);
  // and the caption arrives after an honest nine revolutions (~36 s)
  expect(revolutionsUntilTired()).toBe(9);
  expect(Math.pow(DECAY, 8)).toBeGreaterThanOrEqual(TIRED_AT);
  expect(Math.pow(DECAY, 9)).toBeLessThan(TIRED_AT);
});

test(`${SLUG}: everything is a function of vigor and stays legible at the floor`, () => {
  expect(trailTau(1)).toBe(380);
  expect(trailTau(FLOOR)).toBeCloseTo(120 + 260 * FLOOR, 6);
  expect(ringAlpha(1)).toBeCloseTo(0.85, 6);
  expect(ringAlpha(FLOOR)).toBeCloseTo(0.35 + 0.5 * FLOOR, 6);
  expect(ringAlpha(FLOOR)).toBeGreaterThan(0.35);
  expect(audioGain(1)).toBeCloseTo(0.8, 6);
  expect(lowpassHz(1)).toBe(6400);
  expect(lowpassHz(0)).toBe(400);
  expect(parseRgb('#4FE9C4', [0, 0, 0])).toEqual([79, 233, 196]);
  expect(parseRgb('rgb(1, 2, 3)', [0, 0, 0])).toEqual([1, 2, 3]);
  expect(parseRgb('Highlight', [9, 8, 7])).toEqual([9, 8, 7]);
});

test(`${SLUG}: revival overshoots to 1.15 with --ease-enter and settles at 1.0`, () => {
  expect(reviveCurve(0.3, 0)).toBeCloseTo(0.3, 6);
  expect(reviveCurve(0.3, 1)).toBeCloseTo(RESTED, 6);
  let peak = 0;
  for (let k = 0; k <= 1; k += 0.01) peak = Math.max(peak, reviveCurve(0.3, k));
  expect(peak).toBeGreaterThan(1.05);
  expect(peak).toBeLessThanOrEqual(REVIVED + 1e-9);
  // it rises fast: within the first fifth it is already above where it started
  expect(reviveCurve(0.3, 0.2)).toBeGreaterThan(0.9);
});

test(`${SLUG}: depth is 0.25 viewed, 0.5 dimmed, 0.75 the caption, 1.0 a revival`, () => {
  expect(depthFor(1, false, false)).toBe(0.25);
  expect(depthFor(0.79, false, false)).toBe(0.5);
  expect(depthFor(0.5, true, false)).toBe(0.75);
  expect(depthFor(0.5, true, true)).toBe(1);
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
      if (data[i + 3]! > 0) lit++;
      n++;
    }
    const mean = sum / n;
    return { mean, variance: sumSq / n - mean * mean, lit, n };
  });
}

const vigorOf = (page: Page) =>
  page.locator('[data-room="wear"]').getAttribute('data-vigor').then((v) => Number(v));

/**
 * Time is driven with Playwright's fake clock in the tests below. The site's
 * clock advances by a dt clamped to 50 ms per animation frame (§C.4), so on a
 * starved CPU a revolution takes longer than 4 s of wall time; faking the
 * clock makes "one revolution" mean exactly 80 frames of 50 ms and lets samples
 * be taken at exactly the same sweep phase — the room's "turn so far" arc grows
 * with phase, and comparing means at mismatched phases is not a test.
 */
async function freeze(page: Page) {
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 5000);
}

/** Advance the frozen clock by `ms`, one 50 ms frame at a time. */
async function advance(page: Page, ms: number) {
  for (let t = 0; t < ms; t += 50) await page.clock.fastForward(50);
}

test(`${SLUG}: the room mounts, draws, keeps its text equivalent and reports section_viewed`, async ({
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
  await expect(page.locator('[data-room="wear"]')).toHaveAttribute('data-vigor', '1.000', {
    timeout: 2000,
  });
  await expect(page.locator('[data-room="wear"]')).toHaveAttribute('data-tired', 'false');

  const html = await (await page.request.get('/')).text();
  expect(html).toContain('id="section-wear"');
  expect(html).toContain('getting tired');
  expect(html).toContain('href="/?s=garden"');

  await expect(page.locator('#loop-room')).toHaveAttribute('aria-label', /wear/);

  await page.waitForTimeout(400);
  const stats = await roomStats(page);
  expect(stats.variance, 'the room must not be a uniform image').toBeGreaterThan(1);

  // the hook line is spoken on entry
  await expect(page.locator('#loop-status')).toHaveText(TIRED);

  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.waitForTimeout(300);
  expect(seen).toContain('wear');
});

test(`${SLUG}: doing nothing dims it — and a one-level nudge revives it fully`, async ({ page }) => {
  await page.clock.install();
  await page.goto(`/?s=${SLUG}`);
  const root = page.locator('[data-room="wear"]');
  await expect(root).toHaveAttribute('data-vigor', '1.000', { timeout: 4000 });

  // the visitor's one node; placing it is itself a change, so vigor is 1.000
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '1');
  await freeze(page);

  // one revolution of nothing: 0.94 — sampled 300 ms after the wrap
  await advance(page, SWEEP_MS + 300);
  await expect(root).toHaveAttribute('data-vigor', '0.940');
  const fresh = await roomStats(page);
  expect(fresh.variance).toBeGreaterThan(1);

  // two revolutions of nothing: 0.94² = 0.8836 — sampled at exactly the same phase
  await advance(page, SWEEP_MS);
  await expect(root).toHaveAttribute('data-vigor', '0.884');
  const dimmed = await roomStats(page);
  expect(dimmed.mean, 'the room must dim as vigor decays').toBeLessThan(fresh.mean);
  // …but nothing is removed: the node is still there, the composition still complete
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '1');
  expect(dimmed.variance).toBeGreaterThan(1);

  // the cheapest possible change: nudge the node by one radius level
  await page.locator('#stage').focus();
  await page.keyboard.press('ArrowUp');
  await advance(page, 400); // inside the 900 ms overshoot
  await expect(root).toHaveAttribute('data-vigor', '1.000');
  await expect(page.locator('#loop-status')).toHaveText(BETTER);
  const revived = await roomStats(page);
  expect(revived.mean, 'a one-level nudge must fully revive the room').toBeGreaterThan(dimmed.mean);
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '1');

  // `better.` is a 2.5 s caption, then silence — never a timer, never a number
  await advance(page, 3000);
  await expect(page.locator('#loop-status')).not.toHaveText(BETTER);
  const status = await page.locator('#loop-status').textContent();
  expect(status ?? '').not.toMatch(/\d/);
});

test(`${SLUG}: it says it's getting tired once, gently, and any change answers`, async ({ page }) => {
  // twelve revolutions is 960 frames, each drawn for real: give it room on a busy CPU
  test.setTimeout(180_000);
  await page.clock.install();
  await page.goto(`/?s=${SLUG}`);
  const root = page.locator('[data-room="wear"]');
  await expect(root).toHaveAttribute('data-vigor', '1.000', { timeout: 4000 });
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '1');
  await freeze(page);

  // eight revolutions of nothing: 0.94⁸ ≈ 0.61 — not yet tired, nothing said
  await advance(page, SWEEP_MS * 8 + 200);
  await expect(root).toHaveAttribute('data-tired', 'false');
  expect(await vigorOf(page)).toBeGreaterThanOrEqual(TIRED_AT);
  await expect(page.locator('#loop-status')).not.toHaveText(TIRED);

  // the ninth: 0.94⁹ ≈ 0.57 — the caption, once
  await advance(page, SWEEP_MS);
  await expect(root).toHaveAttribute('data-tired', 'true');
  await expect(page.locator('#loop-status')).toHaveText(TIRED);
  const v = await vigorOf(page);
  expect(v).toBeLessThan(TIRED_AT);
  expect(v).toBeGreaterThanOrEqual(FLOOR);

  // the caption is persistent, not a flash, and carries no number; nothing
  // was taken away; the room stays legible, and vigor never goes below the floor
  await advance(page, SWEEP_MS * 2);
  await expect(page.locator('#loop-status')).toHaveText(TIRED);
  await expect(root).toHaveAttribute('data-tired', 'true');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '1');
  expect(await vigorOf(page)).toBeGreaterThanOrEqual(FLOOR);
  const tired = await roomStats(page);
  expect(tired.variance, 'the room stays legible when tired').toBeGreaterThan(1);

  // the fix is change: one radius level down is enough, and it is better.
  await page.locator('#stage').focus();
  await page.keyboard.press('ArrowDown');
  await advance(page, 100);
  await expect(root).toHaveAttribute('data-tired', 'false');
  await expect(root).toHaveAttribute('data-vigor', '1.000');
  await expect(page.locator('#loop-status')).toHaveText(BETTER);
});

test(`${SLUG}: no words appear that are not in the inventory, and no numerals`, async ({ page }) => {
  await page.goto(`/?s=${SLUG}`);
  await expect(page.locator('[data-room="wear"]')).toHaveAttribute('data-vigor', '1.000', {
    timeout: 2000,
  });
  // the room-owned element renders no text of its own
  await expect(page.locator('[data-room="wear"]')).toHaveText('');
  const shell = await page.locator('.room-shell[data-slug="wear"]').innerText();
  expect(shell.toLowerCase()).not.toMatch(/\d|timer|streak|hurry|miss|last chance|expire/);
  expect(shell).toContain('wear');
  expect(shell).toContain(TIRED);
  expect(shell).toContain('garden');
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

  test(`${SLUG}: decay is expressed as alpha only, and revival is an instant lift`, async ({
    page,
  }) => {
    await page.clock.install();
    await page.goto(`/?s=${SLUG}`);
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
    const root = page.locator('[data-room="wear"]');
    await expect(root).toHaveAttribute('data-vigor', '1.000', { timeout: 4000 });
    await page.locator('#stage').focus();
    await page.keyboard.press('Space');
    await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '1');
    await freeze(page);
    await advance(page, 500);
    const still = await roomStats(page);
    expect(still.variance, 'the still must not be a uniform image').toBeGreaterThan(1);

    await advance(page, SWEEP_MS + 400); // past the wrap and the 150 ms step
    await expect(root).toHaveAttribute('data-vigor', '0.940');
    const fresh = await roomStats(page);
    await advance(page, SWEEP_MS); // same phase, one step dimmer
    await expect(root).toHaveAttribute('data-vigor', '0.884');
    const dimmed = await roomStats(page);
    expect(dimmed.mean).toBeLessThan(fresh.mean);
    // alpha only: the same pixels are painted, just fainter (no shape change)
    expect(Math.abs(dimmed.lit - fresh.lit) / Math.max(1, fresh.lit)).toBeLessThan(0.12);
    expect(dimmed.variance).toBeGreaterThan(1);

    await page.locator('#stage').focus();
    await page.keyboard.press('ArrowUp');
    await advance(page, 100); // an instant lift: no overshoot to wait out
    await expect(root).toHaveAttribute('data-vigor', '1.000');
    const lifted = await roomStats(page);
    expect(lifted.mean).toBeGreaterThan(dimmed.mean);
  });
});
