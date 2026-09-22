/**
 * tests/rooms/mirror.spec.ts — MIRROR (§D.6), owned by WP4.
 *
 * `test` and `expect` come from '../fixtures', which asserts zero console
 * errors, zero page errors and no response >= 400 on every test here.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '../fixtures';

const SLUG = 'mirror';

/** Luminance variance of the room layer, sampled every 97th pixel. */
async function roomVariance(page: import('@playwright/test').Page): Promise<number> {
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

/** Mean luminance of the room layer inside the ring (the tunnel). */
async function tunnelLuminance(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => {
    const canvas = document.getElementById('loop-room') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const s = getComputedStyle(document.documentElement);
    const dpr = canvas.width / canvas.clientWidth;
    const r = parseFloat(s.getPropertyValue('--ring-r')) * dpr * 0.9;
    const cx = parseFloat(s.getPropertyValue('--ring-cx')) * dpr;
    const cy = parseFloat(s.getPropertyValue('--ring-cy')) * dpr;
    const size = Math.max(2, Math.floor(r * 2));
    const { data } = ctx.getImageData(Math.floor(cx - r), Math.floor(cy - r), size, size);
    let sum = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 4 * 13) {
      sum += (data[i]! + data[i + 1]! + data[i + 2]!) / 3;
      n++;
    }
    return sum / n;
  });
}

test(`${SLUG}: the shell is server-rendered with its hook and the next room by name`, async ({
  request,
}) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain(`id="section-${SLUG}"`);
  expect(html).toContain('it sees itself');
  expect(html).toContain('href="/?s=growth"');
});

test(`${SLUG}: declares heavy: true and the room layer runs at DPR <= 1.5`, async ({ page }) => {
  const index = readFileSync(join(process.cwd(), 'src', 'sections', SLUG, 'index.ts'), 'utf8');
  expect(index).toMatch(/heavy:\s*true/);

  await page.goto(`/?s=${SLUG}`);
  await expect(page.locator(`[data-room="${SLUG}"]`)).toHaveCount(1);
  await page.waitForTimeout(300);
  const dpr = await page.evaluate(() => {
    const room = document.getElementById('loop-room') as HTMLCanvasElement;
    const bg = document.getElementById('loop-bg') as HTMLCanvasElement;
    return {
      device: window.devicePixelRatio,
      room: room.width / room.clientWidth,
      bg: bg.width / bg.clientWidth,
    };
  });
  expect(dpr.room).toBeLessThanOrEqual(1.5 + 0.01);
  expect(dpr.bg).toBeLessThanOrEqual(1.5 + 0.01);
  expect(dpr.room).toBeGreaterThanOrEqual(Math.min(1.5, dpr.device) - 0.01);
});

test(`${SLUG}: mounts within 2 s, keeps a text equivalent, and reports section_viewed`, async ({
  page,
}) => {
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
  await expect(page.locator(`.room-shell[data-slug="${SLUG}"]`)).toHaveAttribute(
    'data-active',
    'true',
  );
  await expect(page.locator(`[data-room="${SLUG}"]`)).toHaveCount(1, { timeout: 2000 });
  await expect(page.locator('#loop-room')).toHaveAttribute('aria-label', /\S/);
  await page.waitForTimeout(500);
  expect(await roomVariance(page), 'the room layer must not be a uniform image').toBeGreaterThan(1);
  await expect.poll(() => seen.includes(SLUG), { timeout: 20_000 }).toBe(true);
});

test(`${SLUG}: the canvas draws its own last frame — a fire echoes into the tunnel`, async ({
  page,
}) => {
  await page.goto(`/?s=${SLUG}`);
  const hook = page.locator(`[data-room="${SLUG}"]`);
  await expect(hook).toHaveCount(1);
  await page.waitForTimeout(400);
  // with no nodes the tunnel is the ring's own echo: something, not nothing
  const quiet = await tunnelLuminance(page);
  expect(quiet).toBeGreaterThan(0);

  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '2');

  // the sweep comes back around: the first echo (depth 0.5)
  await expect(hook).not.toHaveAttribute('data-echoes', '0', { timeout: 5000 });
  await page.waitForTimeout(120);
  // the fire's arc is receding inside the ring: the tunnel is brighter than it was
  const lit = await tunnelLuminance(page);
  expect(lit).toBeGreaterThan(quiet);
  expect(await roomVariance(page)).toBeGreaterThan(1);
});

test(`${SLUG}: the pointer leans the tunnel (depth 0.75)`, async ({ page, isMobile }) => {
  test.skip(isMobile, 'a lean needs a hovering pointer');
  await page.goto(`/?s=${SLUG}`);
  const hook = page.locator(`[data-room="${SLUG}"]`);
  await expect(hook).toHaveCount(1);
  const box = await page.locator('#stage').boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.move(box!.x + box!.width * 0.7, box!.y + box!.height * 0.45, { steps: 5 });
  await expect(hook).toHaveAttribute('data-lean', '1');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '0');
});

test(`${SLUG}: reduced motion is six nested rings, still and complete`, async ({ page }) => {
  await page.goto(`/?s=${SLUG}`);
  await expect(page.locator(`[data-room="${SLUG}"]`)).toHaveCount(1);
  await page.locator('[data-control="motion"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
  await page.waitForTimeout(600);
  expect(await roomVariance(page), 'the still must not be a uniform image').toBeGreaterThan(1);
  expect(await tunnelLuminance(page)).toBeGreaterThan(0);
  // a node joins the still without breaking it
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '1');
  await page.waitForTimeout(300);
  expect(await roomVariance(page)).toBeGreaterThan(1);
});

test(`${SLUG}: the ghost mark appears at revolution 8 and is generated, not attributed`, async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'a 32 s dwell; asserted once, on the desktop project');
  test.slow();
  await page.goto(`/?s=${SLUG}`);
  const hook = page.locator(`[data-room="${SLUG}"]`);
  await expect(hook).toHaveCount(1);
  await expect(hook).not.toHaveAttribute('data-ghost', '1');
  // eight in-room revolutions at 4000 ms each
  await expect(hook).toHaveAttribute('data-ghost', '1', { timeout: 36_000 });
  // nothing claims it is a person: no forbidden copy anywhere in the document
  const text = (await page.locator('body').innerText()).toLowerCase();
  for (const banned of ['someone else', 'another', 'people', 'visitor', 'online', 'right now']) {
    expect(text, `forbidden copy: ${banned}`).not.toContain(banned);
  }
});

test(`${SLUG}: never mutates the visitor's node set`, async ({ page }) => {
  await page.goto('/');
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '2');
  await page.keyboard.press('6');
  await expect(page.locator(`.room-shell[data-slug="${SLUG}"]`)).toHaveAttribute(
    'data-active',
    'true',
  );
  await page.waitForTimeout(600);
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '2');
});
