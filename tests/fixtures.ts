/**
 * tests/fixtures.ts — the shared fixture every spec uses. **OWNED BY WP-D.**
 *
 * Spec: design/11-narrative-build-spec.md §H.1, §H.2. Applied to EVERY spec:
 *   - zero console errors
 *   - zero pageerror
 *   - no response >= 400
 *
 * Import `test` and `expect` from here, never from '@playwright/test'.
 */

import { test as base, expect, type Page } from '@playwright/test';

/** The twelve accounts, in nav order. `four-seconds` is always last. */
export const ACCOUNT_SLUGS = [
  'dog',
  'lamp',
  'kettle',
  'moth',
  'river',
  'bus',
  'radio',
  'clock',
  'window',
  'switch',
  'road',
  'four-seconds',
] as const;

export type AccountSlug = (typeof ACCOUNT_SLUGS)[number];

/** The account `/` server-renders as selected. */
export const LANDING: AccountSlug = 'dog';

/** One revolution of the clock, and the four seconds themselves. */
export const SWEEP_MS = 4000;

/** The viewports §F.3 and §H.2 measure at. 180 is 200 % zoom. */
export const VIEWPORTS = [320, 360, 393, 412, 180, 1024, 1440] as const;

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

/**
 * Go to an account and wait until the runtime has entered it. `data-s` is set
 * before first paint by the bootstrap, so this resolves almost immediately;
 * what it really waits for is the account being the displayed one.
 */
export async function gotoAccount(page: Page, slug: AccountSlug): Promise<void> {
  await page.goto(`/?s=${slug}`);
  await expect(page.locator(`#section-${slug}`)).toBeVisible();
}

/** The account the document is currently showing, from `html[data-s]`. */
export async function activeAccount(page: Page): Promise<string | null> {
  return page.evaluate(() => document.documentElement.getAttribute('data-s'));
}

/** Seed `loop:v2` before the first script runs. */
export async function seedState(
  page: Page,
  state: Record<string, unknown>,
): Promise<void> {
  await page.addInitScript((s) => {
    try {
      window.localStorage.setItem('loop:v2', JSON.stringify(s));
    } catch {
      /* a test that cannot seed is a test that checks the empty case */
    }
  }, { v: 2, ...state });
}

/**
 * Install a `layout-shift` PerformanceObserver before anything runs and
 * return a reader for the accumulated score. §H.2 (e) wants exactly 0.
 */
export async function watchLayoutShift(page: Page): Promise<() => Promise<number>> {
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number };
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
        if (!e.hadRecentInput) w.__cls += e.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  return () => page.evaluate(() => (window as unknown as { __cls: number }).__cls);
}
