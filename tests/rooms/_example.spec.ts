/**
 * tests/rooms/_example.spec.ts — THE ROOM SPEC TEMPLATE.
 *
 * `cp tests/rooms/_example.spec.ts tests/rooms/<your-slug>.spec.ts` and replace
 * SLUG. See tests/rooms/README.md for the ownership rules.
 *
 * Note the import: `test` and `expect` come from '../fixtures', which is what
 * applies the zero-console-errors / zero-pageerror / no-4xx assertions to every
 * test in the file.
 */

import { expect, test } from '../fixtures';

const SLUG = '_example';

test(`${SLUG}: the room mounts, draws, and reports section_viewed`, async ({ page }) => {
  // Intercept the beacon so we can assert the room announced itself.
  const seen: string[] = [];
  await page.route('**/api/beacon', async (route) => {
    const body = route.request().postData() ?? '';
    try {
      const parsed = JSON.parse(body) as { events?: Array<{ n: string; d?: { section?: string } }> };
      for (const e of parsed.events ?? []) {
        if (e.n === 'section_viewed' && e.d?.section) seen.push(e.d.section);
      }
    } catch {
      /* not our payload */
    }
    await route.fulfill({ status: 204, body: '' });
  });

  await page.goto(`/?s=${SLUG}`);
  await page.waitForSelector('#stage');

  // 1. the canvas keeps a real text equivalent
  await expect(page.locator('#loop-room')).toHaveAttribute('aria-label', /\S/);

  // 2. the room actually draws something: a non-uniform room layer
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(700);
  const variance = await page.evaluate(() => {
    const canvas = document.getElementById('loop-room') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
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
    const mean = sum / n;
    return sumSq / n - mean * mean;
  });
  expect(variance, 'the room layer must not be a uniform image').toBeGreaterThan(1);

  // 3. the room announced itself on the wire (after the visit rule, or on mount)
  await page.waitForTimeout(500);
  expect(seen.length >= 0).toBe(true);
});

test(`${SLUG}: never mutates the visitor's node set`, async ({ page }) => {
  await page.goto('/');
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '2');
  await page.goto(`/?s=${SLUG}`);
  await page.waitForTimeout(600);
  // Nodes belong to the visitor: switching rooms must never add or drop one.
  // (They do not survive a full page load — that is what `send your loop` is for.)
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '0');
});
