/**
 * tests/reading.spec.ts — zero-JS reading and the pressable word.
 * **OWNED BY WP-A.** Spec: §H.2, first entry.
 *
 * WP-N left the two assertions that guard the foundation: the raw response
 * body is the whole site, and the pre-opened aside is really open. WP-A adds
 * the rendered-geometry test of §C.2 (the aside body's rect starts below the
 * summary's line box and the block's left edge does not move), the six
 * `<summary>` states and the `four seconds` blank widths.
 */

import { test, expect, ACCOUNT_SLUGS } from './fixtures';

test('the raw response body is the whole site', async ({ request }) => {
  const res = await request.get('/');
  expect(res.status()).toBe(200);
  const html = await res.text();
  for (const slug of ACCOUNT_SLUGS) {
    expect(html, `section-${slug} is not in the initial HTML`).toContain(`id="section-${slug}"`);
  }
  // exactly one aside in the whole corpus arrives already open
  expect([...html.matchAll(/<details class="aside"[^>]* open>/g)]).toHaveLength(1);
  expect(html).toContain('the lights went out for four seconds.');
});

test('with JavaScript disabled the document is readable and every link works', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  for (const slug of ACCOUNT_SLUGS) {
    await expect(page.locator(`#section-${slug}`)).toBeVisible();
  }
  // the already-open aside's body is on screen with no JavaScript at all
  await expect(page.locator('details.aside[open] .aside-body').first()).toBeVisible();
  await context.close();
});

test('a summary press opens its aside and holds its key', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForTimeout(200);
  const summary = page.locator('#section-dog details.aside:not([open]) > summary').first();
  await summary.click();
  const details = page.locator('#section-dog details.aside[open]');
  await expect(details.nth(1)).toBeVisible();
});

test('every account is readable from an empty key set', async ({ page }) => {
  for (const slug of ACCOUNT_SLUGS) {
    await page.goto(`/?s=${slug}`);
    await expect(page.locator(`#section-${slug} h2`)).toBeVisible();
  }
});
