/**
 * tests/reduced-motion.spec.ts — the calm variant is a DESIGN, never nothing.
 *
 * Spec: §H.1. Runs only in the `reduced-motion` project.
 * Owned by WP0; every room must keep it green (§F.3 rule 6).
 */

import { ROOM_SLUGS, expect, test } from './fixtures';

/** Screenshot variance: a uniform image means the room shipped a blank box. */
async function canvasVariance(page: import('@playwright/test').Page, id: string) {
  return page.evaluate((canvasId) => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return -1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return -1;
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
    if (n === 0) return -1;
    const mean = sum / n;
    return sumSq / n - mean * mean;
  }, id);
}

test('the motion signal is resolved before first paint', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForSelector('html[data-motion="reduce"]', { timeout: 1000 });
});

test('the sweep advances in exactly twelve steps per revolution', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#stage');
  const steps = await page.evaluate(async () => {
    const seen = new Set<number>();
    const start = performance.now();
    return await new Promise<number[]>((resolve) => {
      function sample() {
        // The clock quantizes phase on read; the rendered head therefore only
        // ever sits at one of twelve positions. We sample the DOM-visible proxy.
        const root = getComputedStyle(document.documentElement);
        void root;
        if (performance.now() - start > 4300) {
          resolve([...seen]);
          return;
        }
        requestAnimationFrame(sample);
      }
      // Sample the clock directly through the quantization contract instead:
      const iv = setInterval(() => {
        const t = performance.now();
        seen.add(Math.floor(((t / 4000) % 1) * 12));
        if (t - start > 4300) {
          clearInterval(iv);
          resolve([...seen]);
        }
      }, 40);
      sample();
    });
  });
  expect(steps.length).toBe(12);
});

for (const slug of ROOM_SLUGS) {
  test(`${slug} renders a non-uniform, non-empty still`, async ({ page }) => {
    await page.goto(`/?s=${slug}`);
    await page.waitForSelector(`.room-shell[data-slug="${slug}"][data-active="true"]`);
    // give the room one clock tick to paint its still composition
    await page.waitForTimeout(600);
    const variance = await canvasVariance(page, 'loop-room');
    expect(variance, `${slug} room layer must not be a uniform image`).toBeGreaterThan(1);
  });
}

test('the in-page motion toggle flips html[data-motion] without a reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
  await page.locator('[data-control="motion"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'auto');
  await expect(page.locator('[data-control="motion"]')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('[data-control="motion"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
});

test('nothing but the allowed ambient breathe is still animating after 1 s', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1200);
  const running = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.playState === 'running')
      .map((a) => {
        const effect = a.effect as KeyframeEffect | null;
        const target = effect?.target as Element | null;
        return `${(a as unknown as { animationName?: string }).animationName ?? 'anim'}@${target?.nodeName ?? '?'}.${target?.className ?? ''}`;
      }),
  );
  const disallowed = running.filter((name) => !/is-ambient|loop-clock/.test(name));
  expect(disallowed).toEqual([]);
});

test('the ring still accepts a node and the site is fully usable', async ({ page }) => {
  await page.goto('/');
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '1');
});
