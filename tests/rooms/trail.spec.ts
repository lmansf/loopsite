/**
 * tests/rooms/trail.spec.ts — TRAIL, notch 4 (§D.4). Owned by WP3.
 *
 * `test` and `expect` come from '../fixtures', which applies the
 * zero-console-errors / zero-pageerror / no-4xx assertions to every test.
 */

import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';

const SLUG = 'trail';

/** Luminance variance of the room layer, sampled; a uniform image is ~0. */
async function variance(page: Page) {
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

/** The number of inked pixels on the room layer (alpha above a floor). */
async function inked(page: Page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('loop-room') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let n = 0;
    for (let i = 3; i < data.length; i += 4 * 3) if (data[i]! > 24) n++;
    return n;
  });
}

test(`${SLUG}: the shell is in the raw response body`, async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain(`id="section-${SLUG}"`);
  expect(html).toContain('it draws');
  expect(html).toContain('href="/?s=swarm"');
});

test(`${SLUG}: the room mounts within 2 s, keeps a text equivalent, and reports section_viewed`, async ({
  page,
}) => {
  test.setTimeout(60_000);
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
  await expect(page.locator(`.room-shell[data-slug="${SLUG}"]`)).toHaveAttribute('data-active', 'true');
  await expect(page.locator('#loop-room')).toHaveAttribute('aria-label', /trail/);

  // the chunk mounted and drew: a non-uniform room layer within 2 s
  await expect.poll(() => variance(page), { timeout: 2000 }).toBeGreaterThan(1);

  // the beacon flushes on its 10 s idle timer
  await expect.poll(() => seen.includes(SLUG), { timeout: 20_000 }).toBe(true);
});

test(`${SLUG}: the ink is never cleared — the drawing grows revolution over revolution`, async ({
  page,
}) => {
  await page.goto(`/?s=${SLUG}`);
  await page.waitForSelector(`.room-shell[data-slug="${SLUG}"][data-active="true"]`);
  await page.waitForTimeout(900);
  const early = await inked(page);
  await page.waitForTimeout(2600);
  const later = await inked(page);
  expect(early).toBeGreaterThan(0);
  expect(later).toBeGreaterThan(early * 1.5);
});

test(`${SLUG}: a node bends the pen — the figure gains new pixels when a node fires`, async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto(`/?s=${SLUG}`);
  await page.waitForSelector(`.room-shell[data-slug="${SLUG}"][data-active="true"]`);
  await page.waitForTimeout(4600); // one calm revolution: the trefoil is complete
  const mask = () =>
    page.evaluate(() => {
      const canvas = document.getElementById('loop-room') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const out: number[] = [];
      for (let i = 3; i < data.length; i += 4 * 3) out.push(data[i]! > 24 ? 1 : 0);
      return out;
    });
  const calm = await mask();
  await page.locator('#stage').focus();
  await page.keyboard.press('Space'); // at the sweep: fires next revolution
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowUp'); // level 13: a real outward kick
  await page.waitForTimeout(4600);
  const bent = await mask();
  let fresh = 0;
  let calmCount = 0;
  for (let i = 0; i < calm.length; i++) {
    if (calm[i]) calmCount++;
    if (bent[i] && !calm[i]) fresh++;
  }
  expect(calmCount).toBeGreaterThan(0);
  // the bent pass covers pixels the calm trefoil never touched
  expect(fresh).toBeGreaterThan(calmCount * 0.08);
});

test(`${SLUG}: never mutates the visitor's node set`, async ({ page }) => {
  await page.goto('/?s=tone');
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '2');
  await page.keyboard.press('ArrowRight'); // → trail, same document
  await expect(page.locator(`.room-shell[data-slug="${SLUG}"]`)).toHaveAttribute('data-active', 'true');
  await page.waitForTimeout(1500);
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '2');
});

test(`${SLUG}: a long-press off the band keeps the drawing as a PNG`, async ({ page }) => {
  await page.goto(`/?s=${SLUG}`);
  await page.waitForSelector(`.room-shell[data-slug="${SLUG}"][data-active="true"]`);
  await page.waitForTimeout(500);
  const download = page.waitForEvent('download');
  await page.evaluate(async () => {
    const stage = document.getElementById('stage')!;
    const rect = stage.getBoundingClientRect();
    const opts = {
      bubbles: true,
      cancelable: true,
      pointerId: 5,
      pointerType: 'touch',
      isPrimary: true,
      clientX: rect.left + 16,
      clientY: rect.top + rect.height * 0.5,
    };
    stage.dispatchEvent(new PointerEvent('pointerdown', opts));
    await new Promise((r) => setTimeout(r, 720));
    stage.dispatchEvent(new PointerEvent('pointerup', opts));
  });
  expect((await download).suggestedFilename()).toMatch(/^loop-\d+-[A-Za-z0-9_-]+\.png$/);
  // a press that lifts before 600 ms keeps nothing
  let extra = false;
  page.once('download', () => {
    extra = true;
  });
  await page.evaluate(async () => {
    const stage = document.getElementById('stage')!;
    const rect = stage.getBoundingClientRect();
    const opts = {
      bubbles: true,
      cancelable: true,
      pointerId: 6,
      pointerType: 'touch',
      isPrimary: true,
      clientX: rect.left + 16,
      clientY: rect.top + rect.height * 0.5,
    };
    stage.dispatchEvent(new PointerEvent('pointerdown', opts));
    await new Promise((r) => setTimeout(r, 200));
    stage.dispatchEvent(new PointerEvent('pointerup', opts));
    await new Promise((r) => setTimeout(r, 700));
  });
  expect(extra).toBe(false);
});

test(`${SLUG}: the pen never leaves the stage at 320 px`, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(`/?s=${SLUG}`);
  await page.waitForSelector(`.room-shell[data-slug="${SLUG}"][data-active="true"]`);
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(4500);
  const edge = await page.evaluate(() => {
    const canvas = document.getElementById('loop-room') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;
    // the outermost 4 device px on the left and right edges must be blank
    let n = 0;
    for (let y = 0; y < height; y += 2) {
      for (const x of [0, 1, 2, 3, width - 4, width - 3, width - 2, width - 1]) {
        if (ctx.getImageData(x, y, 1, 1).data[3]! > 8) n++;
      }
    }
    return n;
  });
  expect(edge).toBe(0);
});
