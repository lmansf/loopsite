/**
 * tests/reduced-motion.spec.ts — the complete variant, never nothing.
 * **OWNED BY WP-C.** Spec: §C.16, §H.2.
 *
 * Runs only in the `reduced-motion` project, under
 * `contextOptions: { reducedMotion: 'reduce' }`.
 *
 * WP-N left the three assertions that the whole reduced-motion contract rests
 * on: every account renders a still, complete composition (never a blank box),
 * nothing is animating a second after load, and `requestAnimationFrame` is
 * never scheduled at all — which is only true because `startClock()` is now
 * called by `<Ambient>` and by nothing else (§D.4). WP-C adds the per-figure
 * stills and `gentle mode`.
 */

import { test, expect, ACCOUNT_SLUGS } from './fixtures';

test('every account renders a still, complete composition', async ({ page }) => {
  for (const slug of ACCOUNT_SLUGS) {
    await page.goto(`/?s=${slug}`);
    const shot = await page.locator(`#section-${slug}`).screenshot();
    const distinct = new Set(shot.subarray(0, Math.min(shot.length, 40_000)));
    expect(distinct.size, `${slug} renders a uniform image`).toBeGreaterThan(8);
    const text = await page.locator(`#section-${slug}`).innerText();
    expect(text.trim().length, `${slug} renders nothing`).toBeGreaterThan(80);
  }
});

test('nothing is running a second after load', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1000);
  const running = await page.evaluate(
    () => document.getAnimations().filter((a) => a.playState === 'running').length,
  );
  expect(running).toBe(0);
});

test('requestAnimationFrame is never scheduled', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __raf: number };
    w.__raf = 0;
    const real = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      w.__raf += 1;
      return real(cb);
    };
  });
  await page.goto('/');
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => (window as unknown as { __raf: number }).__raf)).toBe(0);
});
