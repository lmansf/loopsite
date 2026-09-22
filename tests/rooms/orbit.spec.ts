/**
 * tests/rooms/orbit.spec.ts — ORBIT (§D.8). Owned by WP5.
 *
 * Asserts, beyond the template minimum:
 *   - the traced curve ALWAYS closes: P(0) and P(1) coincide numerically for
 *     every node set (pure, against the sum itself), and in the browser the
 *     first and last sampled points of the visitor's own curve coincide;
 *   - the harmonic label appears on pointer proximity and on keyboard focus,
 *     and the labelled circle is slowed;
 *   - the mobile chain cap and sample count;
 *   - the reduced-motion variant is a complete, static, non-uniform still.
 */

import { expect, ringGeometry, test } from '../fixtures';
import { mulberry32 } from '../../src/lib/rng';
import {
  CHAIN_CAP_MOBILE,
  SAMPLES,
  SAMPLES_MOBILE,
  closureGap,
  sampleCurve,
  termsFor,
} from '../../src/sections/orbit/logic';
import type { RingNode } from '../../src/lib/types';

const SLUG = 'orbit';
const ROOT = '[data-room="orbit"]';

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

function parsePoint(s: string | null): [number, number] {
  const [x, y] = (s ?? '').split(',').map(Number);
  return [x ?? NaN, y ?? NaN];
}

/* ------------------------------------------------------------ pure */

test(`${SLUG}: the true epicycle sum always closes, for every node set`, () => {
  const rnd = mulberry32(0x0b17);
  const R = 351;
  const cx = 720;
  const cy = 450;
  const samples = new Float32Array(2 * (SAMPLES + 1));
  const scratch = new Float64Array(2);

  for (let trial = 0; trial < 60; trial++) {
    const count = 1 + Math.floor(rnd() * 24);
    const nodes = randomNodes(rnd, count);
    const terms = termsFor(nodes, R, 24);
    expect(terms.length).toBe(count);
    // integer harmonics, in order, amplitudes that shrink with the harmonic
    let scale = 0;
    for (let i = 0; i < terms.length; i++) {
      const t = terms[i]!;
      expect(t.k).toBe(i + 1);
      expect(Number.isInteger(t.k)).toBe(true);
      expect(t.A).toBeGreaterThan(0);
      scale += t.A;
    }
    // closure: P(1) − P(0) is zero up to floating point
    const gap = closureGap(terms, cx, cy);
    expect(gap, `trial ${trial}: |P(1) − P(0)|`).toBeLessThan(1e-9 * scale);

    // and the sampled polyline the room strokes starts where it ends
    for (const n of [SAMPLES, SAMPLES_MOBILE]) {
      sampleCurve(terms, cx, cy, n, samples, scratch);
      const dx = samples[n * 2]! - samples[0]!;
      const dy = samples[n * 2 + 1]! - samples[1]!;
      expect(Math.hypot(dx, dy)).toBeLessThan(1e-3);
    }
  }

  // the mobile chain cap keeps the twelve largest terms, in harmonic order
  const many = termsFor(randomNodes(rnd, 24), R, CHAIN_CAP_MOBILE);
  expect(many.length).toBe(CHAIN_CAP_MOBILE);
  for (let i = 1; i < many.length; i++) expect(many[i]!.k).toBeGreaterThan(many[i - 1]!.k);
  expect(closureGap(many, cx, cy)).toBeLessThan(1e-9 * R);

  // an empty ring has no terms and a trivially closed curve
  expect(termsFor([], R, 24)).toEqual([]);
  expect(closureGap([], cx, cy)).toBe(0);
});

/* ------------------------------------------------------------ browser */

test(`${SLUG}: the room mounts, draws, and reports section_viewed`, async ({ page }) => {
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
  await expect(page.locator(`.room-shell[data-slug="${SLUG}"] .hook`)).toHaveText('circles on circles');
  await expect(page.locator(`.room-shell[data-slug="${SLUG}"] .next-link`)).toHaveAttribute('href', '/?s=loom');

  // an empty ring is still a composition, never a blank box
  await page.waitForTimeout(400);
  expect(await variance(page), 'the empty-ring still must not be uniform').toBeGreaterThan(1);

  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  expect(await variance(page)).toBeGreaterThan(1);
  expect(await variance(page, 'loop-bg')).toBeGreaterThan(0);

  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.waitForTimeout(300);
  expect(seen).toContain(SLUG);
});

test(`${SLUG}: the visitor's own curve closes — start and end coincide`, async ({ page }) => {
  await page.goto(`/?s=${SLUG}`);
  await page.waitForSelector('#stage');
  await page.locator('#stage').focus();
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(90);
  }
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '7');
  await nextFrame(page);

  const root = page.locator(ROOT);
  await expect(root).toHaveAttribute('data-orbit-terms', '7');
  const gap = Number(await root.getAttribute('data-orbit-gap'));
  expect(gap).toBeLessThan(1e-6);
  const p0 = parsePoint(await root.getAttribute('data-orbit-p0'));
  const p1 = parsePoint(await root.getAttribute('data-orbit-p1'));
  expect(Number.isFinite(p0[0]) && Number.isFinite(p1[1])).toBe(true);
  expect(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), 'P(1) meets P(0)').toBeLessThan(1e-3);
  expect(Number(await root.getAttribute('data-orbit-reach'))).toBeGreaterThan(0);

  // one harmonic button per term: the keyboard equivalent of the chain
  await expect(page.locator(`${ROOT} ol[aria-label="orbit"] button`)).toHaveCount(7);
});

test(`${SLUG}: pointer proximity labels a circle's harmonic and slows it`, async ({ page }) => {
  await page.goto(`/?s=${SLUG}`);
  await page.waitForSelector('#stage');
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(80);
  await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '2');
  await nextFrame(page);

  const root = page.locator(ROOT);
  await expect(root).toHaveAttribute('data-orbit-terms', '2');
  await expect(root).not.toHaveAttribute('data-orbit-label', /\d/);

  // the first circle is always centred on the ring: its radius is 0.42·ρ(8) = 0.42·R
  const g = await ringGeometry(page);
  await page.mouse.move(g.cx + g.r * 0.42, g.cy);
  await nextFrame(page);
  await nextFrame(page);
  await expect(root).toHaveAttribute('data-orbit-label', '1');
  await expect(root).toHaveAttribute('data-orbit-slowed', '1');

  // the slow lasts 600 ms and then re-converges; the clock is untouched
  await page.waitForTimeout(900);
  await expect(root).toHaveAttribute('data-orbit-slowed', '0');

  // moving away drops the label
  await page.mouse.move(g.cx + g.r * 0.42 + 120, g.cy + 120);
  await nextFrame(page);
  await nextFrame(page);
  await expect(root).not.toHaveAttribute('data-orbit-label', /\d/);
});

test(`${SLUG}: focusing a harmonic from the keyboard does what hovering does`, async ({ page }) => {
  await page.goto(`/?s=${SLUG}`);
  await page.waitForSelector('#stage');
  await page.locator('#stage').focus();
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(80);
  }
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '3');

  const buttons = page.locator(`${ROOT} ol[aria-label="orbit"] button`);
  await expect(buttons).toHaveCount(3);
  await buttons.nth(2).focus();
  await expect(buttons.nth(2)).toBeFocused();
  await nextFrame(page);
  await nextFrame(page);
  const root = page.locator(ROOT);
  await expect(root).toHaveAttribute('data-orbit-label', '3');
  await expect(root).toHaveAttribute('data-orbit-slowed', '1');
  // the focused list is visible on screen, not only in the accessibility tree
  await expect(buttons.nth(2)).toBeVisible();
  // and Tab moves on: focus is never trapped
  await page.keyboard.press('Tab');
  await expect(buttons.nth(2)).not.toBeFocused();
});

test(`${SLUG}: never mutates the visitor's node set`, async ({ page }) => {
  await page.goto('/');
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '2');
  await page.locator('#stage').press('8');
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
    await page.waitForTimeout(600);
    expect(await variance(page)).toBeGreaterThan(1);
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

    // with nodes the still is the complete chain at t = 0 plus the whole curve
    await page.locator('#stage').focus();
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(60);
    }
    await nextFrame(page);
    const root = page.locator(ROOT);
    await expect(root).toHaveAttribute('data-orbit-terms', '5');
    expect(Number(await root.getAttribute('data-orbit-gap'))).toBeLessThan(1e-6);
    expect(await variance(page)).toBeGreaterThan(1);
  });
});
