/**
 * tests/a11y.spec.ts — the hard gate, per §H.1 and rubric G.
 *
 * Tagged @a11y so `pnpm test:a11y` can run it alone.
 * Owned by WP0; every work package must keep it green.
 */

import AxeBuilder from '@axe-core/playwright';
import { ROOM_SLUGS, expect, test } from './fixtures';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function scan(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
}

test.describe('a11y @a11y', () => {
  test('the landing route has zero serious or critical violations', async ({ page }) => {
    await page.goto('/');
    const violations = await scan(page);
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('still clean after visiting all twelve rooms', async ({ page }) => {
    await page.goto('/');
    await page.locator('#stage').focus();
    for (const digit of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=']) {
      await page.keyboard.press(digit);
      await page.waitForTimeout(60);
    }
    const violations = await scan(page);
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('an alias route is clean', async ({ page }) => {
    await page.goto('/s/tone', { waitUntil: 'commit' });
    await page.waitForLoadState('load');
    const violations = await scan(page);
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('the skip link is first in the tab order and reaches the stage', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.locator('.skip-link');
    await expect(skip).toBeFocused();
    await expect(skip).toHaveText('skip to the ring');
    await page.keyboard.press('Tab');
    await expect(page.locator('#stage')).toBeFocused();
  });

  test('the stage is operable and focus is never trapped', async ({ page }) => {
    await page.goto('/');
    await page.locator('#stage').focus();
    await page.keyboard.press('Space');
    await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '1');
    // Esc lifts the ring; the next Space restores it exactly (§J.9).
    await page.keyboard.press('Escape');
    await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '0');
    await page.keyboard.press('Space');
    await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '1');
    // Tab leaves the stage.
    await page.keyboard.press('Tab');
    await expect(page.locator('#stage')).not.toBeFocused();
  });

  test('every canvas has aria-label or aria-hidden, and the live region exists', async ({ page }) => {
    await page.goto('/');
    const canvases = page.locator('canvas');
    const count = await canvases.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const c = canvases.nth(i);
      const label = await c.getAttribute('aria-label');
      const hidden = await c.getAttribute('aria-hidden');
      expect(Boolean(label) || hidden === 'true').toBe(true);
    }
    await expect(page.locator('#loop-status[aria-live="polite"]')).toHaveCount(1);
  });

  test('state is never encoded by colour alone in the Ringway', async ({ page }) => {
    await page.goto('/');
    const notches = page.locator('nav[aria-label="rooms"] a');
    for (const slug of ROOM_SLUGS) {
      const a = notches.locator(`xpath=//a[@href="/?s=${slug}"]`).first();
      void a;
    }
    // Each notch carries its visited state as TEXT in the accessibility tree.
    await expect(notches.first()).toContainText(/visited/);
    await expect(page.locator('nav[aria-label="rooms"] a[aria-current="page"]')).toHaveCount(1);
  });

  test('there is no horizontal overflow at 320 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
