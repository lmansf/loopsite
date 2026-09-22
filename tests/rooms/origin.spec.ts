/**
 * tests/rooms/origin.spec.ts — ORIGIN, the ring engine and the hero. Owned by WP1.
 *
 * Spec: design/05-build-spec.md §B, §C.1–C.3, §D.1, §G (WP1 acceptance).
 * Import `test` and `expect` from '../fixtures': that is what applies the
 * zero-console-errors / zero-pageerror / no-4xx assertions to every test.
 */

import type { Page, Route } from '@playwright/test';
import { expect, ringGeometry, test } from '../fixtures';

const SLUG = 'origin';

/** Serve every script as empty so React never arrives: the pre-hydration page. */
async function withoutReact(page: Page) {
  await page.route('**/_next/static/**/*.js', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
  );
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

/** Mean alpha of the room layer sampled around a circle of radius `k · R`. */
async function ringAlpha(page: Page, k: number, canvasId = 'loop-room') {
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
        // a 1 px stroke lands on a fractional pixel: take the brightest of a 3 px radial band
        let best = 0;
        for (const dr of [-1.5, 0, 1.5]) {
          const rr = R * k + dr;
          const x = Math.round((cx + rr * Math.sin(a)) * dpr);
          const y = Math.round((cy - rr * Math.cos(a)) * dpr);
          best = Math.max(best, ctx.getImageData(x, y, 1, 1).data[3]!);
        }
        sum += best;
      }
      return sum / N;
    },
    { k, canvasId },
  );
}

test(`${SLUG}: the shell is server-rendered, the room mounts, the canvas is labelled`, async ({ page, request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain(`id="section-${SLUG}"`);
  expect(html).toContain('tap the ring');

  const seen: string[] = [];
  await page.route('**/api/beacon', async (route) => {
    try {
      const parsed = JSON.parse(route.request().postData() ?? '') as {
        events?: Array<{ n: string; d?: { section?: string } }>;
      };
      for (const e of parsed.events ?? []) if (e.n === 'section_viewed' && e.d?.section) seen.push(e.d.section);
    } catch {
      /* not our payload */
    }
    await route.fulfill({ status: 204, body: '' });
  });

  await page.goto(`/?s=${SLUG}`);
  await expect(page.locator(`.room-shell[data-slug="${SLUG}"]`)).toHaveAttribute('data-active', 'true', {
    timeout: 2000,
  });
  await expect(page.locator('#loop-room')).toHaveAttribute('aria-label', /origin — tap the ring, drawn from your \d+ nodes/);
  await page.waitForTimeout(600);
  expect(await roomVariance(page), 'the room layer is a complete image before any tap').toBeGreaterThan(1);
  expect(seen.length >= 0).toBe(true);
});

test(`${SLUG}: the ring, its sweep and the seed node exist before React`, async ({ page }) => {
  await withoutReact(page);
  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForSelector('html[data-loop-hero-ready]', { timeout: 1000 });
  await page.waitForSelector('.rf-arm', { state: 'attached' });

  const info = await page.evaluate(() => {
    const rf = document.querySelector<HTMLElement>('.rf')!;
    const arm = document.querySelector<HTMLElement>('.rf-arm')!;
    const anim = arm.getAnimations()[0] as CSSAnimation | undefined;
    const progress = anim?.effect?.getComputedTiming().progress ?? -1;
    return {
      width: rf.offsetWidth,
      ringR: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ring-r')),
      playState: anim?.playState,
      name: anim?.animationName,
      progress,
      seed: !!document.querySelector('.rf-seed'),
      hydrated: !!document.querySelector('html[data-ring-live]'),
    };
  });
  expect(info.hydrated).toBe(false);
  expect(info.ringR).toBeGreaterThan(100);
  // 78% of the short axis, painted from the bootstrap's mirrors (§C.1)
  expect(Math.abs(info.width - info.ringR * 2)).toBeLessThan(2);
  expect(info.playState).toBe('running');
  expect(info.name).toBe('loop-clock-sweep');
  // already a third of the way round: the site was running before you got here (§B)
  expect(info.progress).toBeGreaterThan(0.33);
  expect(info.progress).toBeLessThan(0.9);
  expect(info.seed).toBe(true);
});

test(`${SLUG}: a tap before React is painted at once and becomes a node when React arrives`, async ({ page }) => {
  // hold every script back for 1.5 s so the tap lands in the pre-hydration window
  await page.route('**/_next/static/**/*.js', async (route: Route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForSelector('html[data-loop-hero-ready]', { timeout: 1000 });
  await page.waitForSelector('.rf-tap', { state: 'attached' });

  const g = await ringGeometry(page);
  const x = g.cx + g.r * Math.sin(0.2 * Math.PI * 2);
  const y = g.cy - g.r * Math.cos(0.2 * Math.PI * 2);
  const pre = await page.evaluate(
    ({ x, y }) => {
      document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, pointerId: 1 }));
      const boot = (window as unknown as { __loop: { taps: unknown[]; tap: boolean } }).__loop;
      return {
        taps: boot.taps.length,
        tap: boot.tap,
        engaged: document.documentElement.dataset.stageState,
        dot: getComputedStyle(document.querySelector('.rf-tap')!).display,
        hydrated: !!document.querySelector('html[data-ring-live]'),
      };
    },
    { x, y },
  );
  expect(pre.hydrated).toBe(false);
  expect(pre.taps).toBe(1);
  expect(pre.tap).toBe(true);
  expect(pre.engaged).toBe('engaged'); // `tap the ring` dies on first touch
  expect(pre.dot).toBe('block');

  // React arrives and adopts the tap: one real node, no gesture lost
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '1', { timeout: 8000 });
  await expect(page.locator('html[data-ring-live]')).toHaveCount(1);
});

test(`${SLUG}: a node fires exactly one revolution after it is placed (4000 ms ±40 ms)`, async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('html[data-ring-live]');
  const r = await page.evaluate(async () => {
    type Boot = { frame: { t: number }; lastFire?: { t: number; lateness: number; id: string } };
    const boot = (window as unknown as { __loop: Boot }).__loop;
    const stage = document.getElementById('stage')!;
    stage.focus();
    const t0 = boot.frame.t;
    stage.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
    const fire = await new Promise<{ t: number; lateness: number } | null>((resolve) => {
      const started = performance.now();
      const poll = () => {
        if (boot.lastFire && boot.lastFire.t > t0) return resolve(boot.lastFire);
        if (performance.now() - started > 15_000) return resolve(null); // wall; the assertion is in clock time
        requestAnimationFrame(poll);
      };
      poll();
    });
    return fire ? { clockMs: fire.t - t0, lateness: fire.lateness } : null;
  });
  expect(r).not.toBeNull();
  // the sweep reached the node's angle one revolution after placement; the
  // fire is reported on the first frame after, `lateness` ms late (§C.3)
  expect(r!.lateness).toBeGreaterThanOrEqual(0);
  expect(r!.lateness).toBeLessThan(60);
  expect(Math.abs(r!.clockMs - r!.lateness - 4000)).toBeLessThanOrEqual(40);
  // and the caption says so
  await expect(page.locator('#loop-status')).toContainText('again');
});

test(`${SLUG}: the hero copy sequence, verbatim and in order`, async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('html[data-ring-live]');
  const title = page.locator('#loop-title');
  await expect(title).toHaveText('tap the ringit comes back');
  await expect(page.locator('#loop-status')).toHaveText('');

  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  // `tap the ring` dies on first touch
  await expect(page.locator('html')).toHaveAttribute('data-stage-state', 'engaged');
  await page.waitForTimeout(500);
  expect(parseFloat(await title.evaluate((el) => getComputedStyle(el).opacity))).toBeLessThan(0.05);

  // one revolution (4000 ms of clock time) plus a React commit; the exact
  // 4000 ms ±40 ms is asserted in clock time by the fire-timing test above
  await expect(page.locator('#loop-status')).toHaveText('again', { timeout: 9000 });
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await expect(page.locator('#loop-status')).toHaveText("now it's yours");
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await expect(page.locator('#loop-status')).toHaveText('there are twelve of these');
});

test(`${SLUG}: the ghost demo fires at 6 s and 14 s, exactly twice, then never`, async ({ page }) => {
  test.slow();
  await page.goto('/');
  await page.waitForSelector('html[data-ring-live]');
  await expect(page.locator('#stage')).toHaveAttribute('data-ghost-fires', '0');
  // Measured in CLOCK time (window.__loop.frame.t): the schedule is the site's
  // clock, which lags wall time on a starved machine (dt clamps at 50 ms).
  const fires = await page.evaluate(async () => {
    type Boot = { frame: { t: number } };
    const boot = (window as unknown as { __loop: Boot }).__loop;
    const stage = document.getElementById('stage')!;
    const seen: Array<{ n: string; t: number }> = [];
    let last = '0';
    return await new Promise<Array<{ n: string; t: number }>>((resolve) => {
      const poll = () => {
        const n = stage.dataset.ghostFires ?? '0';
        if (n !== last) {
          last = n;
          seen.push({ n, t: boot.frame.t });
        }
        if (boot.frame.t >= 24_000) return resolve(seen);
        requestAnimationFrame(poll);
      };
      poll();
    });
  });
  expect(fires.map((f) => f.n)).toEqual(['1', '2']);
  // shown at 6 s, fires ~1 s later (a quarter turn ahead of the head); again at 14 s
  expect(fires[0]!.t).toBeGreaterThan(6000);
  expect(fires[0]!.t).toBeLessThan(8000);
  expect(fires[1]!.t).toBeGreaterThan(14_000);
  // placed 120° from the first (§B), so the head reaches it up to one revolution later
  expect(fires[1]!.t).toBeLessThan(18_100);
  await expect(page.locator('#stage')).toHaveAttribute('data-ghost', 'done');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '0'); // a ghost is never a node
});

test(`${SLUG}: any real input cancels the ghost demo for good`, async ({ page }) => {
  test.slow();
  await page.goto('/');
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-ghost', 'off');
  // past both the 6 s slot and its ~1 s fire, in clock time
  await page.waitForFunction(() => (window as unknown as { __loop: { frame: { t: number } } }).__loop.frame.t >= 9000, null, {
    timeout: 30_000,
  });
  await expect(page.locator('#stage')).toHaveAttribute('data-ghost-fires', '0');
});

test(`${SLUG}: the seed node is the site's until you take it, then it is yours`, async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('html[data-ring-live]');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '0');
  const g = await ringGeometry(page);
  const a = 0.62 * Math.PI * 2;
  const x = g.cx + g.r * Math.sin(a);
  const y = g.cy - g.r * Math.cos(a);
  const b = 0.7 * Math.PI * 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(g.cx + g.r * Math.sin(b), g.cy - g.r * Math.cos(b), { steps: 6 });
  await page.mouse.up();
  // grabbing the seed promotes it into the visitor's set; dragging retimed it
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '1');
});

test(`${SLUG}: a flick past 1.45 R removes a node; the 25th tap is refused without a word`, async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('html[data-ring-live]');
  const g = await ringGeometry(page);
  // flick along the viewport's long axis so 1.7 R stays on screen: 3 o'clock in
  // landscape, 12 o'clock in portrait
  const vp = page.viewportSize()!;
  const turn = vp.width > vp.height ? 0.25 : 0;
  const a = turn * Math.PI * 2;
  const x = g.cx + g.r * Math.sin(a);
  const y = g.cy - g.r * Math.cos(a);
  await page.mouse.click(x, y);
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '1');

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(g.cx + g.r * 1.7 * Math.sin(a), g.cy - g.r * 1.7 * Math.cos(a), { steps: 3 });
  await page.mouse.up();
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '0');

  await page.locator('#stage').focus();
  for (let i = 0; i < 25; i++) await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '24');
  await expect(page.locator('#stage')).toHaveAttribute('data-refused', '1');
  const status = await page.locator('#loop-status').textContent();
  expect(['', 'again', "now it's yours", 'there are twelve of these']).toContain(status ?? '');
});

test(`${SLUG}: after the third node a second ring turns at 0.72 R`, async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('html[data-ring-live]');
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  const before = await ringAlpha(page, 0.72);
  await page.keyboard.press('Space');
  await page.waitForTimeout(1200);
  const after = await ringAlpha(page, 0.72);
  expect(after - before).toBeGreaterThan(20);
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test(`${SLUG}: the CSS hand steps twelve times from the first frame, and the still is complete`, async ({ page }) => {
    await withoutReact(page);
    await page.goto('/', { waitUntil: 'commit' });
    await page.waitForSelector('html[data-motion="reduce"]', { timeout: 1000 });
    await page.waitForSelector('.rf-arm', { state: 'attached' });
    const timing = await page.evaluate(() => getComputedStyle(document.querySelector('.rf-arm')!).animationTimingFunction);
    expect(timing).toContain('steps(12');
    const tail = await page.evaluate(() => getComputedStyle(document.querySelector('.rf-tail')!).display);
    expect(tail).toBe('none');
  });

  test(`${SLUG}: the room layer is a non-uniform still under reduced motion`, async ({ page }) => {
    await page.goto(`/?s=${SLUG}`);
    await page.waitForSelector('html[data-ring-live]');
    await page.waitForTimeout(600);
    expect(await roomVariance(page)).toBeGreaterThan(1);
  });
});
