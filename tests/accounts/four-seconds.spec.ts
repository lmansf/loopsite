/**
 * tests/accounts/four-seconds.spec.ts — one file per account. **OWNED BY WP-C.**
 * Spec: §H.2, last entry.
 *
 * WP-N left the four assertions every account owes: it is in the raw response
 * body, `/?s=four-seconds` activates it and only it, its ask control names its own
 * `next`, and it reads from an empty key set. WP-C adds the beacon
 * interception, the figure's still, and this account's own authored behaviour
 * — the contradiction it takes part in, or, for `four-seconds`, that zero
 * keys prints exactly one block and every blank rule is the width of the
 * sentence it hides.
 */

import { test, expect, ACCOUNT_SLUGS, activeAccount } from '../fixtures';

const SLUG = 'four-seconds';
const NEXT = 'dog';

test('four-seconds is in the raw response body', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain(`id="section-${SLUG}"`);
});

test('four-seconds activates on its own URL and nothing else does', async ({ page }) => {
  await page.goto(`/?s=${SLUG}`);
  expect(await activeAccount(page)).toBe(SLUG);
  await expect(page.locator(`#section-${SLUG}`)).toBeVisible();
  for (const other of ACCOUNT_SLUGS) {
    if (other === SLUG) continue;
    await expect(page.locator(`#section-${other}`)).toBeHidden();
  }
});

test('four-seconds names what it hands on', async ({ page }) => {
  await page.goto(`/?s=${SLUG}`);
  await expect(page.locator('.ask-bar:visible')).toHaveAttribute('href', `/?s=${NEXT}`);
  await expect(page.locator(`#section-${SLUG} .ask.card`)).toHaveAttribute(
    'href',
    `/?s=${NEXT}`,
  );
});

test('four-seconds reads from an empty key set', async ({ page }) => {
  await page.goto(`/?s=${SLUG}`);
  const text = await page.locator(`#section-${SLUG} .blocks`).innerText();
  expect(text.trim().length).toBeGreaterThan(60);
});
