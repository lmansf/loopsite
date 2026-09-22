/**
 * tests/fixtures.ts — the shared fixture every spec uses.
 *
 * Spec: design/05-build-spec.md §H.1. Applied to EVERY spec:
 *   - zero console errors
 *   - zero pageerror
 *   - no response >= 400
 *
 * Import `test` and `expect` from here, never from '@playwright/test'.
 */

import { test as base, expect, type Page } from '@playwright/test';

export const ROOM_SLUGS = [
  'origin',
  'pulse',
  'tone',
  'trail',
  'swarm',
  'mirror',
  'growth',
  'orbit',
  'loom',
  'wear',
  'garden',
  'return',
] as const;

export const HIDDEN_SLUGS = ['silence', 'reverse', 'slow', '144', 'twin'] as const;

export const SWEEP_MS = 4000;

export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    const problems: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
    });
    page.on('pageerror', (e) => problems.push(`pageerror: ${String(e)}`));
    page.on('response', (r) => {
      if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`);
    });
    await use(page);
    expect(problems, 'zero console errors, zero page errors, no response >= 400').toEqual([]);
  },
});

export { expect };

/** The ring's current geometry, read from the CSS mirrors the stage writes. */
export async function ringGeometry(page: Page) {
  return page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return {
      r: parseFloat(s.getPropertyValue('--ring-r')),
      cx: parseFloat(s.getPropertyValue('--ring-cx')),
      cy: parseFloat(s.getPropertyValue('--ring-cy')),
    };
  });
}

/** Tap a point on the ring band at a given normalized turn (0 = 12 o'clock). */
export async function tapRing(page: Page, turn: number) {
  const g = await ringGeometry(page);
  const x = g.cx + g.r * Math.sin(turn * Math.PI * 2);
  const y = g.cy - g.r * Math.cos(turn * Math.PI * 2);
  await page.mouse.click(x, y);
}
