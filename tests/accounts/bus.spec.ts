/**
 * tests/accounts/bus.spec.ts — one file per account. **OWNED BY WP-C.**
 * Spec: §H.2, last entry.
 *
 * The six things every account owes, and the whole of what this file is for:
 * it is in the served document, its own URL activates it and only it, the ask
 * control and the ask card both name what it hands on, it reads from an empty
 * key set, its slot in the night is where the reader is, and it can be left
 * and come back to.
 */

import { test, expect, ACCOUNT_SLUGS, activeAccount } from '../fixtures';

const SLUG = 'bus';
const TITLE = "the last bus";
const ASK = "ask the radio";
const NEXT = 'radio';
const NEXT_TITLE = "the radio";

test('bus is in the raw response body', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain(`id="section-${SLUG}"`);
  expect(html).toContain(`href="/?s=${SLUG}"`);
});

test('bus activates on its own URL and nothing else does', async ({ page }) => {
  await page.goto(`/?s=${SLUG}`);
  expect(await activeAccount(page)).toBe(SLUG);
  await expect(page.locator(`#section-${SLUG}`)).toBeVisible();
  for (const other of ACCOUNT_SLUGS) {
    if (other === SLUG) continue;
    await expect(page.locator(`#section-${other}`)).toBeHidden();
  }
});

test('bus names what it hands on', async ({ page }) => {
  await page.goto(`/?s=${SLUG}`);
  const bar = page.locator('.ask-bar:visible');
  await expect(bar.locator('.ask-text')).toHaveAttribute('href', `/?s=${NEXT}`);
  await expect(bar.locator('.ask-text')).toHaveText(ASK);
  const card = page.locator(`#section-${SLUG} .ask.card`);
  await expect(card).toHaveAttribute('href', `/?s=${NEXT}`);
  await expect(card).toContainText(NEXT_TITLE);
});

test('bus reads from an empty key set', async ({ page }) => {
  await page.goto(`/?s=${SLUG}`);
  const text = await page.locator(`#section-${SLUG} .blocks`).innerText();
  expect(text.trim().length).toBeGreaterThan(60);
});

test('bus is where the reader is, in its own night', async ({ page }) => {
  await page.goto(`/?s=${SLUG}`);
  const night = page.locator(`#section-${SLUG} .night`);
  await expect(night.locator('> a')).toHaveCount(ACCOUNT_SLUGS.length);
  const here = night.locator(`> a[data-slug="${SLUG}"]`);
  await expect(here).toHaveAttribute('aria-current', 'page');
  await expect(here).toHaveAttribute('data-state', 'read');
  await expect(here).toContainText(TITLE);
  await expect(night.locator('> a[aria-current="page"]')).toHaveCount(1);
});

test('bus can be left and come back to', async ({ page }) => {
  await page.goto(`/?s=${SLUG}`);
  const away = ACCOUNT_SLUGS.find((s) => s !== SLUG) as string;
  await page.locator(`#section-${SLUG} .night > a[data-slug="${away}"]`).click();
  await expect(page.locator(`#section-${away}`)).toBeVisible();
  await page.locator(`#section-${away} .night > a[data-slug="${SLUG}"]`).click();
  await expect(page.locator(`#section-${SLUG}`)).toBeVisible();
  expect(await activeAccount(page)).toBe(SLUG);
});
