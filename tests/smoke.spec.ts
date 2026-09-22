/**
 * tests/smoke.spec.ts — the gate every other spec assumes.
 * **OWNED BY WP-D.** Spec: §H.2, last entry.
 *
 * The shared fixture already applies "zero console errors, zero pageerror, no
 * response >= 400" to every spec in the suite.
 */

import { test, expect, LANDING } from './fixtures';

test('/ returns 200 with one h1 and the bootstrap attributes set', async ({ page }) => {
  const response = await page.goto('/', { waitUntil: 'commit' });
  expect(response?.status()).toBe(200);
  await expect
    .poll(
      () =>
        page.evaluate(() => ({
          js: document.documentElement.hasAttribute('data-loop-js'),
          s: document.documentElement.getAttribute('data-s'),
        })),
      { timeout: 1000 },
    )
    .toEqual({ js: true, s: LANDING });
  await expect(page.locator('h1')).toHaveCount(1);
});

test('the first summary press is handled before React hydrates', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' });
  const summary = page.locator('#section-dog details.aside:not([open]) > summary').first();
  await summary.click();
  await expect(page.locator('#section-dog details.aside[open]')).toHaveCount(2);
});

test('the alias route redirects to the canonical one', async ({ page }) => {
  await page.goto('/s/kettle');
  await page.waitForURL(/\?s=kettle/);
  await expect(page.locator('#section-kettle')).toBeVisible();
});
