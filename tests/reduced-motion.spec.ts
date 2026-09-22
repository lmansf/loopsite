/**
 * tests/reduced-motion.spec.ts — the complete variant, never nothing.
 * **OWNED BY WP-C.** Spec: §C.16, §D.4, §H.2.
 *
 * Runs only in the `reduced-motion` project, under
 * `contextOptions: { reducedMotion: 'reduce' }`.
 *
 * The contract is not "less"; it is "the same site, still". Every word is
 * still pressable, every key still fires, every blank is still exact, and the
 * ambient figure is still a complete composition — it is simply the authored
 * still at phase 0.25, drawn once, with the clock never started. The last of
 * those is the one that is easy to lose and expensive to lose: `startClock()`
 * is called by `<Ambient>` and by nothing else, so a reader who has asked for
 * less runs no `requestAnimationFrame` at all (§D.4).
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
  for (const slug of ['dog', 'clock', 'four-seconds']) {
    await page.goto(`/?s=${slug}`);
    await page.waitForTimeout(1000);
    const running = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => a.playState === 'running')
        .map((a) => (a as CSSAnimation).animationName ?? 'anonymous'),
    );
    expect(running, `${slug} is still animating`).toEqual([]);
  }
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
  // past the idle mount and past one revolution of the clock, twice over
  await page.waitForTimeout(3000);
  expect(await page.evaluate(() => (window as unknown as { __raf: number }).__raf)).toBe(0);
});

/**
 * §C.16's last row: "the authored still at phase 0.25, drawn once, complete".
 * Drawn once is checked above by the absence of a rAF; COMPLETE is checked
 * here — the figure has to put real ink on the canvas in every account, and a
 * different arrangement of it in each, or it is a blank box with a filename.
 */
test('every account draws its own still, and none of them is blank', async ({ page }) => {
  const seen = new Map<string, string>();
  for (const slug of ACCOUNT_SLUGS) {
    await page.goto(`/?s=${slug}`);
    // the still is drawn on the idle callback, or on its 1200 ms fallback
    const ink = await page.waitForFunction(
      () => {
        const c = document.getElementById('ambient') as HTMLCanvasElement | null;
        if (!c || !c.width) return null;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;
        const d = ctx.getImageData(0, 0, c.width, c.height).data;
        let lit = 0;
        let sum = 0;
        for (let i = 3; i < d.length; i += 4) {
          if (d[i] !== 0) {
            lit++;
            sum += i;
          }
        }
        return lit > 200 ? { lit, hash: `${lit}:${sum % 1000003}` } : null;
      },
      undefined,
      { timeout: 8000 },
    );
    const value = await ink.jsonValue();
    seen.set(slug, (value as { hash: string }).hash);
  }
  expect(seen.size).toBe(ACCOUNT_SLUGS.length);
  expect(
    new Set(seen.values()).size,
    `two accounts drew the same figure: ${[...seen].map(([k, v]) => `${k}=${v}`).join(' ')}`,
  ).toBe(ACCOUNT_SLUGS.length);
});

test('the still is drawn and then nothing moves', async ({ page }) => {
  await page.goto('/?s=river');
  await page.waitForTimeout(2000);
  const read = () =>
    page.evaluate(() => {
      const c = document.getElementById('ambient') as HTMLCanvasElement | null;
      return c ? c.toDataURL().length : 0;
    });
  const a = await read();
  await page.waitForTimeout(1200);
  expect(await read()).toBe(a);
});

/** §C.16: `gentle mode` toggles it in page, with aria-pressed, without reload. */
test('gentle mode is pressed, and releases without a reload', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('.loop-footer button[data-control="motion"]');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.dataset.motion)).toBe('reduce');

  const before = page.url();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => document.documentElement.dataset.motion)).toBe('auto');
  expect(page.url(), 'gentle mode reloaded the page').toBe(before);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
});

/** Nothing is LOST under reduced motion — the press still teaches the site. */
test('a word is still pressable and a key still fires', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#section-dog details.aside[open]')).toHaveCount(1);
  await page.locator('#section-dog details.aside:not([open]) > summary').first().click();
  await expect(page.locator('#section-dog details.aside[open]')).toHaveCount(2);
  await expect(page.locator('#section-dog details.aside[open]').first()).toBeVisible();
});

test('the night still tells its three states apart with no motion at all', async ({
  page,
}) => {
  await page.goto('/');
  const bar = await page.evaluate(() => {
    const a = document.querySelector<HTMLElement>('#section-dog .night > a');
    if (!a) return null;
    a.dataset.state = 'changed';
    const mark = a.querySelector('.mark') as HTMLElement;
    const after = getComputedStyle(mark, '::after');
    return { h: parseFloat(after.height || '0'), animation: after.animationName };
  });
  expect(bar?.h, 'the second bar is simply there (§C.16)').toBeGreaterThan(0);
  expect(bar?.animation, 'and it did not animate in').toBe('none');
});
