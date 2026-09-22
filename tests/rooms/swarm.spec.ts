/**
 * tests/rooms/swarm.spec.ts — SWARM (§D.5), owned by WP4.
 *
 * `test` and `expect` come from '../fixtures', which asserts zero console
 * errors, zero page errors and no response >= 400 on every test here.
 */

import { expect, test } from '../fixtures';

const SLUG = 'swarm';

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

test(`${SLUG}: the shell is server-rendered with its hook and the next room by name`, async ({
  request,
}) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain(`id="section-${SLUG}"`);
  expect(html).toContain('they follow it');
  expect(html).toContain('href="/?s=mirror"');
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
  // the chunk is mounted once the room's QA hook exists
  await expect(page.locator(`[data-room="${SLUG}"]`)).toHaveCount(1, { timeout: 2000 });
  await expect(page.locator('#loop-room')).toHaveAttribute('aria-label', /\S/);

  // the flock is drawn: a non-uniform room layer, and the tier count is real
  await page.waitForTimeout(500);
  expect(await roomVariance(page), 'the room layer must not be a uniform image').toBeGreaterThan(1);
  const agents = Number(await page.locator(`[data-room="${SLUG}"]`).getAttribute('data-agents'));
  expect([200, 120, 60]).toContain(agents);

  // section_viewed reaches the wire (the beacon flushes on a 10 s idle timer)
  await expect.poll(() => seen.includes(SLUG), { timeout: 20_000 }).toBe(true);
});

test(`${SLUG}: a node fire is a heartbeat — the flock lunges`, async ({ page }) => {
  await page.goto(`/?s=${SLUG}`);
  const hook = page.locator(`[data-room="${SLUG}"]`);
  await expect(hook).toHaveCount(1);
  await expect(hook).toHaveAttribute('data-lunges', '0');

  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '1');

  // the sweep comes back around within one revolution and the node fires
  await expect(hook).not.toHaveAttribute('data-lunges', '0', { timeout: 5000 });
  const lunges = Number(await hook.getAttribute('data-lunges'));
  expect(lunges).toBeGreaterThanOrEqual(1);

  // and the picture keeps changing: the flock is alive, not a still
  const a = await roomVariance(page);
  await page.waitForTimeout(400);
  const b = await roomVariance(page);
  expect(a).toBeGreaterThan(1);
  expect(b).toBeGreaterThan(1);
});

test(`${SLUG}: the pointer is an interaction (depth 0.75) and is never a node`, async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'the pointer repulsor is a desktop flourish; touch emits a pulse instead');
  await page.goto(`/?s=${SLUG}`);
  const hook = page.locator(`[data-room="${SLUG}"]`);
  await expect(hook).toHaveCount(1);
  const box = await page.locator('#stage').boundingBox();
  expect(box).not.toBeNull();
  // move across the centre of the stage: inside the ring, never on the band
  await page.mouse.move(box!.x + box!.width / 2 - 20, box!.y + box!.height / 2);
  await page.mouse.move(box!.x + box!.width / 2 + 20, box!.y + box!.height / 2, { steps: 4 });
  await expect(hook).toHaveAttribute('data-pointer', '1');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '0');
});

test(`${SLUG}: reduced motion is a still, complete flock`, async ({ page }) => {
  await page.goto(`/?s=${SLUG}`);
  await expect(page.locator(`[data-room="${SLUG}"]`)).toHaveCount(1);
  await page.locator('[data-control="motion"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
  await page.waitForTimeout(600);
  expect(await roomVariance(page), 'the still must not be a uniform image').toBeGreaterThan(1);
  // the ring still accepts a node and the still still stands
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '1');
  await page.waitForTimeout(300);
  expect(await roomVariance(page)).toBeGreaterThan(1);
});

test(`${SLUG}: holds >= 45 fps under a 4x CPU throttle`, async ({ page, isMobile }) => {
  test.skip(isMobile, 'measured on the desktop project; the mobile tier caps at 60 agents');
  test.slow();
  await page.goto(`/?s=${SLUG}`);
  await expect(page.locator(`[data-room="${SLUG}"]`)).toHaveCount(1);
  // a few nodes so the heartbeat, trails and pulse rings are all in play
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(150);
  await page.keyboard.press('Space');
  await page.waitForTimeout(150);
  await page.keyboard.press('Space');
  const box = await page.locator('#stage').boundingBox();
  await page.mouse.move(box!.x + box!.width * 0.4, box!.y + box!.height * 0.4);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  try {
    // warm up: if the tier drops it drops here, before the measurement
    await page.waitForTimeout(2500);
    const measure = () =>
      page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            let frames = 0;
            const t0 = performance.now();
            function tick() {
              frames++;
              if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
              else resolve((frames * 1000) / (performance.now() - t0));
            }
            requestAnimationFrame(tick);
          }),
      );
    let fps = await measure();
    if (fps < 45) fps = Math.max(fps, await measure());
    test.info().annotations.push({ type: 'fps@4x', description: fps.toFixed(1) });
    expect(fps, 'SWARM must hold 45 fps under a 4x CPU throttle').toBeGreaterThanOrEqual(45);
  } finally {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
});

test(`${SLUG}: never mutates the visitor's node set`, async ({ page }) => {
  await page.goto('/');
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '2');
  // a passive room change keeps every node exactly as it was
  await page.keyboard.press('5');
  await expect(page.locator(`.room-shell[data-slug="${SLUG}"]`)).toHaveAttribute(
    'data-active',
    'true',
  );
  await page.waitForTimeout(600);
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '2');
});
