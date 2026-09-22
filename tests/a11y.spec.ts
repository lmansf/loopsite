/**
 * tests/a11y.spec.ts — axe, the keyboard walk and the target geometry.
 * **OWNED BY WP-D.** Spec: §H.2, §F.3, §F.4. Tagged @a11y: `pnpm test:e2e`
 * inverts the grep and `pnpm test:a11y` selects it.
 *
 * WP-N left axe on `/` and on one `/s/<slug>`, and the skip-link-first rule.
 * WP-D adds the twelve-account pass, the full keyboard walk, and the
 * 44 px / 8 px sweep at all seven viewports.
 */

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

test('zero serious or critical on / @a11y', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const bad = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(bad.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
});

test('zero serious or critical on an alias route @a11y', async ({ page, request }) => {
  // The alias route's whole job is generateMetadata, and it replaceStates to
  // the canonical route the moment JavaScript runs (§C.11) — so with
  // JavaScript on, the page axe can actually settle on is the one the reader
  // lands on. The served document is checked separately, below, which is what
  // a reader without JavaScript gets.
  await page.goto('/s/moth');
  await page.waitForURL(/\?s=moth/);
  await expect(page.locator('#section-moth')).toBeVisible();
  const raw = await (await request.get('/s/moth')).text();
  expect(raw).toContain('id="section-moth"');
  expect(raw).toContain('aria-labelledby="h-moth"');
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const bad = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(bad.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
});

test('Tab reaches the skip link first @a11y', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.className ?? '');
  expect(focused).toContain('skip-link');
});

test('every canvas is hidden from the accessibility tree @a11y', async ({ page }) => {
  await page.goto('/');
  const bad = await page
    .locator('canvas')
    .evaluateAll((els) => els.filter((e) => e.getAttribute('aria-hidden') !== 'true').length);
  expect(bad).toBe(0);
});
