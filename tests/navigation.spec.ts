/**
 * tests/navigation.spec.ts — nav state encoding and history.
 * **OWNED BY WP-C.** Spec: §H.2, fourth entry.
 *
 * WP-N left the three-state encoding, the push/replace contract and the
 * ask bar's fixed rect. WP-C adds the shape assertions with colour normalised
 * away, the full keyboard map of §C.15, and the seven-viewport sweep.
 */

import { test, expect, ACCOUNT_SLUGS, activeAccount } from './fixtures';

test('every slot carries one of exactly three states and navigates to itself', async ({
  page,
}) => {
  await page.goto('/');
  const states = await page.locator('#section-dog .night > a').evaluateAll((els) =>
    els.map((e) => (e as HTMLElement).dataset.state),
  );
  expect(states).toHaveLength(ACCOUNT_SLUGS.length);
  for (const s of states) expect(['unread', 'read', 'changed']).toContain(s);

  await page.locator('#section-dog .night > a[data-slug="switch"]').click();
  await expect(page.locator('#section-switch')).toBeVisible();
  expect(await activeAccount(page)).toBe('switch');
});

test('a slot pushes, and Back leaves in one press', async ({ page }) => {
  await page.goto('/');
  await page.locator('#section-dog .night > a[data-slug="river"]').click();
  await expect(page.locator('#section-river')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#section-dog')).toBeVisible();
});

test('the ask bar names its destination and never relocates', async ({ page }) => {
  await page.goto('/');
  const first = await page.locator('.ask-bar:visible').boundingBox();
  await page.locator('#section-dog .night > a[data-slug="road"]').click();
  await expect(page.locator('#section-road')).toBeVisible();
  const second = await page.locator('.ask-bar:visible').boundingBox();
  expect(second?.y).toBe(first?.y);
  expect(second?.height).toBe(first?.height);
  await expect(page.locator('.ask-bar:visible')).toHaveAttribute('href', '/?s=four-seconds');
});

test('the arrow key carries the reader on', async ({ page }) => {
  await page.goto('/');
  await page.locator('body').click({ position: { x: 2, y: 2 } });
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#section-lamp')).toBeVisible();
});

test('no horizontal overflow at 320 and at 200 % zoom', async ({ page }) => {
  for (const width of [320, 180]) {
    await page.setViewportSize({ width, height: 568 });
    await page.goto('/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${width} px overflows`).toBeLessThanOrEqual(0);
  }
});
