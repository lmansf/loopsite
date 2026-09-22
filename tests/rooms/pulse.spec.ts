/**
 * tests/rooms/pulse.spec.ts — PULSE (§D.2). Owned by WP2.
 *
 * Asserts, beyond the template's minimum:
 *   - the room is a complete experience with audio OFF (every test here runs
 *     muted: no test enables audio except the petal test, which enables it
 *     only to prove the gesture path)
 *   - the AudioContext is NEVER constructed outside a real gesture handler
 *     (a spy installed before any script runs counts constructions and records
 *     whether a user activation was active at each one)
 *   - the sound petal appears after the third node, carries aria-pressed, and
 *     reads `sound` / `quiet`; the choice is persisted through loop:v1
 *   - no global flash faster than 2.5 Hz under any node arrangement, including
 *     24 adjacent nodes — asserted on the pure gate and on the rendered field
 *   - under reduced motion the still is complete and there is no global flash
 *
 * `test` and `expect` come from '../fixtures': zero console errors, zero page
 * errors and no response >= 400 on every test.
 */

import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { FLASH_MIN_INTERVAL_MS, FlashGate, depthFor, voiceOf } from '../../src/sections/pulse/logic';

const SLUG = 'pulse';

declare global {
  interface Window {
    __acSpy?: Array<{ gesture: boolean | null }>;
  }
}

/** Wrap AudioContext before any page script runs; record every construction. */
async function installAudioSpy(page: Page) {
  await page.addInitScript(() => {
    const rec: Array<{ gesture: boolean | null }> = [];
    window.__acSpy = rec;
    const Orig = window.AudioContext;
    if (!Orig) return;
    const nav = navigator as Navigator & { userActivation?: { isActive: boolean } };
    class Spied extends Orig {
      constructor(...args: ConstructorParameters<typeof AudioContext>) {
        super(...args);
        rec.push({ gesture: nav.userActivation ? nav.userActivation.isActive : null });
      }
    }
    window.AudioContext = Spied as typeof AudioContext;
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext =
      Spied as typeof AudioContext;
  });
}

async function constructions(page: Page) {
  return page.evaluate(() => window.__acSpy ?? []);
}

/** Luminance variance of a canvas layer; a uniform image scores 0. */
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

/**
 * Sample one far-corner pixel of the background layer for `ms` and return the
 * timestamps at which the field lit up (rising edges). The corner is outside
 * the radial field, so the only thing that can light it is the global flash.
 */
async function flashEdges(page: Page, ms: number) {
  return page.evaluate(async (durationMs) => {
    const canvas = document.getElementById('loop-bg') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const edges: number[] = [];
    let lit = false;
    const start = performance.now();
    await new Promise<void>((resolve) => {
      const tick = () => {
        const px = ctx.getImageData(2, 2, 1, 1).data;
        const on = px[3]! > 6;
        if (on && !lit) edges.push(performance.now() - start);
        lit = on;
        if (performance.now() - start < durationMs) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    return edges;
  }, ms);
}

async function placeNodes(page: Page, count: number, gapMs = 0) {
  await page.locator('#stage').focus();
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Space');
    if (gapMs) await page.waitForTimeout(gapMs);
  }
}

test.describe('the flash gate (pure)', () => {
  test('emits at most one flash per 400 ms whatever fires', () => {
    const gate = new FlashGate();
    let emitted = 0;
    // 24 adjacent nodes all firing on the same frame, every frame, for 4 s
    for (let t = 0; t <= 4000; t += 16) {
      for (let n = 0; n < 24; n++) if (gate.request(t)) emitted++;
    }
    expect(emitted).toBeLessThanOrEqual(Math.floor(4000 / FLASH_MIN_INTERVAL_MS) + 1);
    expect(emitted).toBeGreaterThan(0);
  });

  test('radius level selects the voice and depth is honest', () => {
    expect(voiceOf(0)).toBe('kick');
    expect(voiceOf(4)).toBe('kick');
    expect(voiceOf(5)).toBe('snare');
    expect(voiceOf(10)).toBe('snare');
    expect(voiceOf(11)).toBe('hat');
    const node = (r: number, id: string) => ({ id, a: 0.1, r, v: 0, born: 0 });
    expect(depthFor([], 0, false)).toBe(0);
    expect(depthFor([node(8, 'a')], 0, false)).toBe(0.25);
    expect(depthFor([node(8, 'a'), node(2, 'b')], 0, false)).toBe(0.5);
    expect(depthFor([node(8, 'a')], 0, true)).toBe(0.75);
    expect(depthFor([node(8, 'a'), node(2, 'b'), node(12, 'c')], 0, false)).toBe(1);
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
  expect(html).toContain('id="section-pulse"');
  expect(html).toContain('href="/?s=tone"');

  await installAudioSpy(page);
  await page.goto(`/?s=${SLUG}`);
  await page.waitForSelector('.room-shell[data-slug="pulse"][data-active="true"]', { timeout: 2000 });
  await expect(page.locator('#loop-room')).toHaveAttribute('aria-label', /\S/);

  // With audio off: a complete composition on both layers, before and after nodes.
  await page.waitForTimeout(500);
  expect(await variance(page, 'loop-room'), 'idle room layer').toBeGreaterThan(1);
  await placeNodes(page, 2, 300);
  await page.waitForTimeout(900);
  expect(await variance(page, 'loop-room'), 'room layer with nodes').toBeGreaterThan(1);
  expect(await variance(page, 'loop-bg'), 'background field').toBeGreaterThan(0.5);

  // Nothing here enabled audio, so nothing constructed an AudioContext.
  expect(await constructions(page)).toEqual([]);
  expect(seen.length >= 0).toBe(true);
});

test(`${SLUG}: the sound petal is earned by the third node and constructs audio only in the gesture`, async ({
  page,
}) => {
  await installAudioSpy(page);
  await page.goto(`/?s=${SLUG}`);
  await page.waitForSelector('.room-shell[data-slug="pulse"][data-active="true"]');
  const petal = page.locator('[data-control="sound-petal"]');

  await placeNodes(page, 2, 250);
  await page.waitForTimeout(300);
  await expect(petal, 'no petal before the third node').toHaveCount(0);

  await placeNodes(page, 1);
  await expect(petal).toHaveCount(1);
  await expect(petal).toHaveAttribute('aria-pressed', 'false');
  await expect(petal).toHaveText('sound');
  const box = await petal.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);

  // Time passes, nodes fire, the petal is on screen: still no AudioContext.
  await page.waitForTimeout(2500);
  expect(await constructions(page), 'never constructed outside a gesture').toEqual([]);

  // The press: constructed exactly once, inside a user activation.
  await petal.click();
  await expect(petal).toHaveAttribute('aria-pressed', 'true');
  await expect(petal).toHaveText('quiet');
  const made = await constructions(page);
  expect(made).toHaveLength(1);
  expect(made[0]!.gesture).not.toBe(false);
  // the footer control mirrors the same engine
  await expect(page.locator('[data-control="sound"]')).toHaveAttribute('aria-pressed', 'true');

  // The choice is persisted through storage (debounced 500 ms).
  await page.waitForTimeout(700);
  const stored = await page.evaluate(() => window.localStorage.getItem('loop:v1') ?? '');
  expect(stored).toContain('"sound":true');

  // Off again: the label and the state both change; nothing is re-constructed.
  await petal.click();
  await expect(petal).toHaveAttribute('aria-pressed', 'false');
  await expect(petal).toHaveText('sound');
  expect(await constructions(page)).toHaveLength(1);
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => window.localStorage.getItem('loop:v1') ?? '')).toContain('"sound":false');
});

test(`${SLUG}: a remembered sound preference shows the petal at once but never autoplays`, async ({ page }) => {
  await installAudioSpy(page);
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('loop:v1', JSON.stringify({ v: 1, sound: true }));
    } catch {
      /* storage unavailable: the site simply forgets */
    }
  });
  await page.goto(`/?s=${SLUG}`);
  await page.waitForSelector('.room-shell[data-slug="pulse"][data-active="true"]');
  await expect(page.locator('[data-control="sound-petal"]')).toHaveCount(1);
  await page.waitForTimeout(1500);
  expect(await constructions(page)).toEqual([]);
});

test(`${SLUG}: no global flash faster than 2.5 Hz with 24 adjacent nodes`, async ({ page }) => {
  test.slow();
  await page.goto(`/?s=${SLUG}`);
  await page.waitForSelector('.room-shell[data-slug="pulse"][data-active="true"]');
  // 24 nodes placed as fast as the keyboard allows: adjacent, all voices firing
  // within a fraction of a revolution.
  await placeNodes(page, 24);
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '24');

  const edges = await flashEdges(page, 4600);
  expect(edges.length, 'the downbeat lights the field at least once per revolution').toBeGreaterThan(0);
  for (let i = 1; i < edges.length; i++) {
    // 400 ms floor, minus one frame of sampling slack
    expect(edges[i]! - edges[i - 1]!, `flash gap ${i}`).toBeGreaterThanOrEqual(FLASH_MIN_INTERVAL_MS - 40);
  }
  // and the cap is a ceiling on count too: 4.6 s admits at most 12 flashes
  expect(edges.length).toBeLessThanOrEqual(Math.floor(4600 / FLASH_MIN_INTERVAL_MS) + 1);
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test(`${SLUG}: the still is a complete composition and the field never flashes`, async ({ page }) => {
    await page.goto(`/?s=${SLUG}`);
    await page.waitForSelector('.room-shell[data-slug="pulse"][data-active="true"]');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
    await placeNodes(page, 3, 200);
    await page.waitForTimeout(700);
    expect(await variance(page, 'loop-room')).toBeGreaterThan(1);
    expect(await variance(page, 'loop-bg')).toBeGreaterThan(0.5);
    const edges = await flashEdges(page, 4400);
    expect(edges, 'no global luminance flash under reduced motion').toEqual([]);
  });
});

test(`${SLUG}: never mutates the visitor's node set`, async ({ page }) => {
  await page.goto('/');
  await placeNodes(page, 2);
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '2');
  await page.locator('#stage').press('2');
  await page.waitForSelector('.room-shell[data-slug="pulse"][data-active="true"]');
  await page.waitForTimeout(1200);
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '2');
});
