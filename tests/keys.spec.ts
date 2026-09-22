/**
 * tests/keys.spec.ts — keys, persistence and interleaving without shift.
 * **OWNED BY WP-B.** Spec: §H.2, third entry.
 *
 * WP-N left (a) and (f) in the shape WP-B will extend: a key granted in one
 * account changes NOTHING in the account on screen, and it survives a reload.
 * WP-B adds the `changed` marker in the same frame, the closed-and-reopened
 * idempotence, the authored-position interleave, and the `layout-shift`
 * observer that must sum to exactly 0 across a whole session.
 */

import { test, expect, seedState, watchLayoutShift } from './fixtures';

test('opening an aside changes nothing in the account on screen', async ({ page }) => {
  await page.goto('/');
  const before = await page.locator('#section-dog .blocks').innerHTML();
  await page.locator('#section-dog details.aside:not([open]) > summary').first().click();
  await page.waitForTimeout(100);
  const after = await page.locator('#section-dog .blocks').innerHTML();
  // the only difference is the <details> that was pressed
  expect(after.replace(/ open=""| data-held="true"/g, '')).toBe(
    before.replace(/ open=""| data-held="true"/g, ''),
  );
});

test('a key survives a reload', async ({ page }) => {
  await page.goto('/');
  const key = await page
    .locator('#section-dog details.aside:not([open])')
    .first()
    .getAttribute('data-key');
  await page.locator('#section-dog details.aside:not([open]) > summary').first().click();
  await page.waitForTimeout(700);
  await page.reload();
  const stored = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('loop:v2') ?? '{}'),
  );
  expect(stored.keys).toContain(key);
});

test('a seeded key materialises its block at its authored position', async ({ page }) => {
  await seedState(page, { keys: ['one-press'] });
  await page.goto('/?s=dog');
  const ids = await page.locator('#section-dog .blk:visible').evaluateAll((els) =>
    els.map((e) => (e as HTMLElement).dataset.id),
  );
  expect(ids).toContain('dog-outside');
  // interleaved, not appended
  expect(ids.indexOf('dog-outside')).toBeLessThan(ids.indexOf('dog-2'));
});

test('a whole navigation shifts nothing', async ({ page }) => {
  const cls = await watchLayoutShift(page);
  await page.goto('/');
  // every account carries its own night, and only the active one is shown —
  // so a slot is always addressed through the section it lives in.
  await page.locator('#section-dog .night > a[data-slug="lamp"]').click();
  await expect(page.locator('#section-lamp')).toBeVisible();
  await page.locator('#section-lamp .night > a[data-slug="river"]').click();
  await expect(page.locator('#section-river')).toBeVisible();
  await page.waitForTimeout(300);
  expect(await cls()).toBe(0);
});
