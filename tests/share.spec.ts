/**
 * tests/share.spec.ts — the round trip. **OWNED BY WP-D.** Spec: §H.2.
 *
 * The codec is WP-D's and does not exist yet (see src/lib/share.ts), so what
 * WP-N left is the half that must be true whether or not it does: a corrupt
 * `#n=` loads the site silently, on the reader's own state, with no error
 * anywhere. WP-D adds the union merge, `someone read it this way`, and the
 * fresh-context restore.
 */

import { test, expect } from './fixtures';

test('a corrupt share code loads the site silently', async ({ page }) => {
  await page.goto('/?s=road#n=not-a-real-code');
  await expect(page.locator('#section-road')).toBeVisible();
  // the fixture asserts zero console errors and zero pageerrors for us
});

test('an inbound link never removes what the reader earned', async ({ page }) => {
  await page.goto('/');
  await page.locator('#section-dog details.aside:not([open]) > summary').first().click();
  await page.waitForTimeout(700);
  const before = await page.evaluate(
    () => JSON.parse(window.localStorage.getItem('loop:v2') ?? '{}').keys?.length ?? 0,
  );
  await page.goto('/?s=lamp#n=AAAAAAAAAAA');
  await page.waitForTimeout(300);
  const after = await page.evaluate(
    () => JSON.parse(window.localStorage.getItem('loop:v2') ?? '{}').keys?.length ?? 0,
  );
  expect(after).toBeGreaterThanOrEqual(before);
});
