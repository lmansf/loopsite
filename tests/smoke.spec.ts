/**
 * tests/smoke.spec.ts — the landing route, per §H.1.
 *
 * Owned by WP0. WP1 adds hero-specific assertions in tests/rooms/origin.spec.ts.
 */

import { expect, ringGeometry, test } from './fixtures';

test('/ returns 200 and renders exactly one h1', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.status()).toBe(200);
  const h1 = page.locator('h1');
  await expect(h1).toHaveCount(1);
  await expect(h1).toContainText('tap the ring');
  await expect(h1).toContainText('it comes back');
});

test('the value proposition is in the raw response body — no JS required', async ({ request }) => {
  const res = await request.get('/');
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toContain('tap the ring');
  expect(html).toContain('it comes back');
  // and the twelve room shells
  expect(html).toContain('id="section-origin"');
  expect(html).toContain('id="section-return"');
});

test('html[data-loop-hero-ready] appears within 1000 ms of commit', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.locator('html[data-loop-hero-ready]')).toHaveCount(1, { timeout: 1000 });
  await expect(page.locator('html[data-loop-js]')).toHaveCount(1);
});

test('a pointermove changes --px before React has hydrated', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForSelector('html[data-loop-hero-ready]', { timeout: 1000 });

  const changed = await page.evaluate(async () => {
    const root = document.documentElement;
    const before = root.style.getPropertyValue('--px');
    root.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: Math.round(window.innerWidth * 0.8),
        clientY: Math.round(window.innerHeight * 0.3),
        pointerId: 1,
      }),
    );
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { before, after: root.style.getPropertyValue('--px') };
  });
  expect(changed.after).not.toBe('');
  expect(changed.after).not.toBe(changed.before);
});

test('a tap inside the ring band places a node in under 100 ms', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#stage[data-node-count]');
  const g = await ringGeometry(page);
  expect(g.r).toBeGreaterThan(0);

  const elapsed = await page.evaluate(
    async ({ cx, cy, r }) => {
      const stage = document.getElementById('stage')!;
      const turn = 0.12;
      const x = cx + r * Math.sin(turn * Math.PI * 2);
      const y = cy - r * Math.cos(turn * Math.PI * 2);
      const start = performance.now();
      const settled = new Promise<number>((resolve) => {
        const mo = new MutationObserver(() => {
          if ((stage.dataset.nodeCount ?? '0') !== '0') {
            mo.disconnect();
            resolve(performance.now() - start);
          }
        });
        mo.observe(stage, { attributes: true, attributeFilter: ['data-node-count'] });
        setTimeout(() => {
          mo.disconnect();
          resolve(Number.POSITIVE_INFINITY);
        }, 2000);
      });
      stage.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          clientX: x,
          clientY: y,
          pointerId: 1,
          isPrimary: true,
        }),
      );
      return settled;
    },
    { cx: g.cx, cy: g.cy, r: g.r },
  );

  expect(elapsed).toBeLessThan(100);
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '1');
});

test('space places a node from the keyboard', async ({ page }) => {
  await page.goto('/');
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '1');
  await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '2');
});

test('the ring never exceeds 24 nodes', async ({ page }) => {
  await page.goto('/');
  await page.locator('#stage').focus();
  for (let i = 0; i < 30; i++) await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '24');
});

test('cumulative layout shift stays at 0 through a session', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
        if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/');
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(1200);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(800);
  const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
  expect(cls).toBe(0);
});

test('there is no spinner, skeleton, modal or dialog in the first viewport', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[role="dialog"], dialog, .skeleton, .spinner')).toHaveCount(0);
});

test('the sweep advances: a placed node fires within one revolution', async ({ page }) => {
  await page.goto('/');
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  // The caption changes to `again` on the first fire (§I.1).
  await expect(page.locator('#loop-status')).toContainText('again', { timeout: 5000 });
});
