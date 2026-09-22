/**
 * tests/rooms/return.spec.ts — RETURN: ORIGIN again, but lit. Owned by WP1.
 *
 * Spec: design/05-build-spec.md §D.12. Import `test`/`expect` from
 * '../fixtures' so the zero-console / zero-pageerror / no-4xx gate applies.
 */

import type { Page } from '@playwright/test';
import { expect, ROOM_SLUGS, test } from '../fixtures';

const SLUG = 'return';
const FINAL_LINE = 'it was always going to come back.';

/** Seed the one storage key before the page loads (the test's own browser, not the site). */
async function seedStorage(page: Page, visited: readonly string[], returns: number) {
  await page.addInitScript(
    ({ visited, returns }) => {
      window.localStorage.setItem(
        'loop:v1',
        JSON.stringify({
          v: 1,
          visited,
          visits: {},
          collected: [],
          maxDepth: 0,
          kept: [],
          lastLoop: null,
          returns,
          sound: false,
          motion: 'auto',
          slow: false,
          reverse: false,
        }),
      );
    },
    { visited, returns },
  );
}

async function readReturns(page: Page) {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem('loop:v1');
    return raw ? (JSON.parse(raw) as { returns?: number }).returns : undefined;
  });
}

async function roomVariance(page: Page) {
  return page.evaluate(() => {
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
}

/** Mean alpha of a layer sampled around a circle of radius `k · R`. */
async function ringAlpha(page: Page, k: number, canvasId: string) {
  return page.evaluate(
    ({ k, canvasId }) => {
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      const s = getComputedStyle(document.documentElement);
      const R = parseFloat(s.getPropertyValue('--ring-r'));
      const cx = parseFloat(s.getPropertyValue('--ring-cx'));
      const cy = parseFloat(s.getPropertyValue('--ring-cy'));
      const dpr = canvas.width / canvas.clientWidth;
      let sum = 0;
      const N = 36;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        const x = Math.round((cx + R * k * Math.sin(a)) * dpr);
        const y = Math.round((cy - R * k * Math.cos(a)) * dpr);
        sum += ctx.getImageData(x, y, 1, 1).data[3]!;
      }
      return sum / N;
    },
    { k, canvasId },
  );
}

/** The brightest green channel in a small window at 12 o'clock on the ring layer. */
async function topOfRingGreen(page: Page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('loop-ring') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const s = getComputedStyle(document.documentElement);
    const R = parseFloat(s.getPropertyValue('--ring-r'));
    const cx = parseFloat(s.getPropertyValue('--ring-cx'));
    const cy = parseFloat(s.getPropertyValue('--ring-cy'));
    const dpr = canvas.width / canvas.clientWidth;
    const w = Math.round(12 * dpr);
    const { data } = ctx.getImageData(Math.round(cx * dpr) - w / 2, Math.round((cy - R) * dpr) - w / 2, w, w);
    let g = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i + 3]! > 40) g = Math.max(g, data[i + 1]!);
    return g;
  });
}

test(`${SLUG}: the shell is server-rendered with no hook line, the room mounts, the canvas is labelled`, async ({
  page,
  request,
}) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain(`id="section-${SLUG}"`);
  const section = html.slice(html.indexOf(`id="section-${SLUG}"`));
  expect(section.slice(0, section.indexOf('</section>'))).not.toContain('class="hook"');

  await page.goto(`/?s=${SLUG}`);
  await expect(page.locator(`.room-shell[data-slug="${SLUG}"]`)).toHaveAttribute('data-active', 'true', {
    timeout: 2000,
  });
  await expect(page.locator('#loop-room')).toHaveAttribute('aria-label', /return — drawn from your \d+ nodes/);
  await page.waitForTimeout(600);
  expect(await roomVariance(page), 'the room layer is a complete image').toBeGreaterThan(1);
});

test(`${SLUG}: the second ring is there from the first frame, and the door is cut into the ring`, async ({ page }) => {
  await page.goto(`/?s=${SLUG}`);
  await page.waitForSelector('html[data-ring-live]');
  await page.waitForTimeout(400);
  expect(await ringAlpha(page, 0.72, 'loop-room')).toBeGreaterThan(30);
  // the threshold line at 12 o'clock is --c-accent-hi (bright); ORIGIN's stroke there is not
  expect(await topOfRingGreen(page)).toBeGreaterThan(150);

  await page.goto('/?s=origin');
  await page.waitForSelector('html[data-ring-live]');
  await page.waitForTimeout(400);
  expect(await topOfRingGreen(page)).toBeLessThan(120);
});

test(`${SLUG}: the door opens the rooms, Esc closes it and returns focus, a link travels`, async ({ page }) => {
  await page.goto(`/?s=${SLUG}`);
  const door = page.locator('button[aria-label="open the rooms"]');
  await expect(door).toBeVisible();
  await expect(door).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#return-map')).toHaveCount(0);

  await door.click();
  const map = page.locator('#return-map[role="dialog"]');
  await expect(map).toBeVisible();
  await expect(door).toHaveAttribute('aria-expanded', 'true');
  const links = map.locator('a');
  await expect(links).toHaveCount(12);
  for (const slug of ROOM_SLUGS) {
    await expect(map.locator(`a[href="/?s=${slug}"]`)).toHaveText(new RegExp(`^${slug}`));
  }
  // origin is lit from the first frame; the current room is marked
  await expect(map.locator('a[href="/?s=origin"]')).toHaveAttribute('data-visited', 'true');
  await expect(map.locator('a[aria-current="page"]')).toHaveAttribute('href', `/?s=${SLUG}`);
  await expect(links.first()).toBeFocused();
  // every target is at least 48 px tall
  const heights = await links.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
  for (const h of heights) expect(h).toBeGreaterThanOrEqual(48);

  await page.keyboard.press('Escape');
  await expect(page.locator('#return-map')).toHaveCount(0);
  await expect(door).toBeFocused();
  // the ring was not emptied by that Esc (§C.12: an open overlay takes it)
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '0');

  await door.click();
  await map.locator('a[href="/?s=pulse"]').click();
  await expect(page.locator('.room-shell[data-slug="pulse"]')).toHaveAttribute('data-active', 'true');
  await expect(page.locator('#return-map')).toHaveCount(0);
  await expect(page.locator('button[aria-label="open the rooms"]')).toHaveCount(0);
});

test(`${SLUG}: arrival counts a return; the final line appears once the twelfth notch lights`, async ({ page }) => {
  test.slow();
  const eleven = ROOM_SLUGS.filter((s) => s !== SLUG);
  await seedStorage(page, eleven, 0);
  await page.goto(`/?s=${SLUG}`);
  await page.waitForSelector('html[data-ring-live]');
  await expect(page.locator('#loop-status')).not.toContainText(FINAL_LINE);
  await page.waitForTimeout(900);
  expect(await readReturns(page)).toBe(1);
  // RETURN itself lights after 3 s active and one full revolution (§C.5)
  await expect(page.locator('#loop-status')).toHaveText(FINAL_LINE, { timeout: 12_000 });
  await page.waitForTimeout(1200);
  await expect(page.locator('#loop-status')).toHaveText(FINAL_LINE); // it stays
});

test(`${SLUG}: the final line is once per visitor — state.returns gates it`, async ({ page }) => {
  await seedStorage(page, ROOM_SLUGS, 1);
  await page.goto(`/?s=${SLUG}`);
  await page.waitForSelector('html[data-ring-live]');
  await page.waitForTimeout(2500);
  await expect(page.locator('#loop-status')).not.toContainText(FINAL_LINE);
  expect(await readReturns(page)).toBe(2);
});

test(`${SLUG}: with every room lit on arrival, the line appears at once`, async ({ page }) => {
  await seedStorage(page, ROOM_SLUGS, 0);
  await page.goto(`/?s=${SLUG}`);
  await expect(page.locator('#loop-status')).toHaveText(FINAL_LINE, { timeout: 3000 });
});

test(`${SLUG}: never mutates the visitor's node set`, async ({ page }) => {
  await page.goto('/');
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '2');
  await page.keyboard.press('=');
  await expect(page.locator(`.room-shell[data-slug="${SLUG}"]`)).toHaveAttribute('data-active', 'true');
  await page.waitForTimeout(600);
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '2');
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test(`${SLUG}: the still is complete under reduced motion`, async ({ page }) => {
    await page.goto(`/?s=${SLUG}`);
    await page.waitForSelector('html[data-ring-live]');
    await page.waitForTimeout(600);
    expect(await roomVariance(page)).toBeGreaterThan(1);
    expect(await ringAlpha(page, 0.72, 'loop-room')).toBeGreaterThan(30);
  });
});
