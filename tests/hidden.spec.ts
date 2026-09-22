/**
 * tests/hidden.spec.ts — the five hidden destinations (§C.13, §D.13). WP7.
 *
 *   - no hidden trigger fires during a scripted "ordinary use" session: 90 s
 *     of tapping the ring, moving rooms and idling leaves `collected` empty;
 *   - each trigger fires when its exact condition is met;
 *   - SILENCE restores the exact previous node set;
 *   - REVERSE and SLOW persist across a reload.
 *
 * The hidden layer mirrors the ring's share code (with the reverse and slow
 * flags) on `[data-hidden-root][data-loop]`, and each destination carries a
 * `[data-hidden=<id>][data-on]` marker. Nothing else is read from the canvas
 * except, for REVERSE, the position of the sweep head.
 */

import { GARDEN_SEEDS } from '../src/lib/garden-seed';
import { decodeLoop, encodeLoop } from '../src/lib/share';
import type { Page } from '@playwright/test';
import { expect, ringGeometry, tapRing, test } from './fixtures';

const STORAGE_KEY = 'loop:v1';

async function collected(page: Page): Promise<string[]> {
  // writes are debounced 500 ms
  await page.waitForTimeout(700);
  return page.evaluate((key: string) => {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as { collected?: string[] };
      return parsed.collected ?? [];
    } catch {
      return [];
    }
  }, STORAGE_KEY);
}

async function loopCode(page: Page): Promise<string> {
  const root = page.locator('[data-hidden-root]');
  await expect(root).toHaveAttribute('data-loop', /\S/, { timeout: 10_000 });
  return (await root.getAttribute('data-loop')) ?? '';
}

function flagsOf(code: string): { reverse: boolean; slow: boolean; n: number } {
  const d = decodeLoop(code);
  return { reverse: d?.reverse ?? false, slow: d?.slow ?? false, n: d?.nodes.length ?? 0 };
}

/**
 * The clock's dt is clamped at 50 ms, so clock time can lag wall time on a
 * busy machine. Thresholds measured in clock time are therefore polled for,
 * never waited for.
 */
async function expectFlag(page: Page, flag: 'reverse' | 'slow', value: boolean): Promise<void> {
  await expect
    .poll(async () => flagsOf(await loopCode(page))[flag], { timeout: 15_000 })
    .toBe(value);
}

const marker = (page: Page, id: string) => page.locator(`[data-hidden="${id}"]`);
const SLOW_EXPECT = { timeout: 15_000 };

/* ------------------------------------------------------------ ordinary use */

test('no hidden destination fires during 90 s of ordinary use', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/');
  const stage = page.locator('#stage');
  await stage.focus();
  const started = Date.now();
  const g = await ringGeometry(page);

  // a few taps, and the wait to see them come back
  await tapRing(page, 0.1);
  await tapRing(page, 0.4);
  await page.keyboard.press('Space');
  await page.waitForTimeout(4500);
  await tapRing(page, 0.7);
  await page.waitForTimeout(3000);

  // move a node a little way round the ring
  const from = { x: g.cx + g.r * Math.sin(0.1 * Math.PI * 2), y: g.cy - g.r * Math.cos(0.1 * Math.PI * 2) };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let k = 1; k <= 6; k++) {
    const a = 0.1 + (0.12 * k) / 6;
    await page.mouse.move(g.cx + g.r * Math.sin(a * Math.PI * 2), g.cy - g.r * Math.cos(a * Math.PI * 2));
    await page.waitForTimeout(40);
  }
  await page.mouse.up();
  await page.waitForTimeout(1500);

  // walk the corridor
  await stage.focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(3500);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(3500);
  await page.locator('nav[aria-label="rooms"] a[href="/?s=trail"]').click();
  await page.waitForTimeout(3500);

  // more nodes, then lift the ring and put it back within a revolution
  await stage.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await page.waitForTimeout(5000);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1500);
  await page.keyboard.press('Space');
  await page.waitForTimeout(2000);

  // the pointer wanders across the stage, through the centre and over the ring
  for (const [x, y] of [
    [g.cx - g.r, g.cy - g.r],
    [g.cx, g.cy],
    [g.cx + g.r, g.cy + g.r],
    [g.cx, g.cy - g.r],
    [g.cx - g.r * 0.5, g.cy],
  ]) {
    await page.mouse.move(x!, y!);
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(1000);

  // rooms by number
  for (const key of ['5', '6', '7']) {
    await stage.focus();
    await page.keyboard.press(key);
    await page.waitForTimeout(3000);
  }

  // a quick tap at the centre, then one node fewer
  await page.mouse.click(g.cx, g.cy);
  await page.waitForTimeout(1000);
  await stage.focus();
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(4500);
  await tapRing(page, 0.9);
  await page.waitForTimeout(4500);

  // the garden, then the end and the start again
  await stage.focus();
  await page.keyboard.press('-');
  await page.waitForTimeout(4000);
  await tapRing(page, 0.55);
  await page.waitForTimeout(3000);
  await stage.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);
  await page.keyboard.press('Enter');
  await page.keyboard.press('=');
  await page.waitForTimeout(4000);
  await page.keyboard.press('1');
  await page.waitForTimeout(4000);

  // idle out the rest of the 90 s with nodes on the ring
  const remaining = 90_000 - (Date.now() - started);
  if (remaining > 0) await page.waitForTimeout(remaining);
  expect(Date.now() - started).toBeGreaterThanOrEqual(90_000);

  expect(await collected(page)).toEqual([]);
  for (const id of ['silence', 'reverse', 'slow', '144', 'twin']) {
    await expect(marker(page, id)).toHaveAttribute('data-on', 'false');
  }
  await expect(page.locator('nav[aria-label="rooms"] .hub')).toHaveCount(0);
});

/* ------------------------------------------------------------ SILENCE */

test('SILENCE: an empty ring for one revolution, and any tap restores it exactly', async ({ page }) => {
  await page.goto('/');
  const stage = page.locator('#stage');
  await stage.focus();
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(350);
  }
  await expect(stage).toHaveAttribute('data-node-count', '3');
  const before = await loopCode(page);
  expect(flagsOf(before).n).toBe(3);

  // one full revolution of nothing, arrived at through Esc (§J.9)
  await page.keyboard.press('Escape');
  await expect(stage).toHaveAttribute('data-node-count', '0');
  await page.waitForTimeout(2500);
  await expect(marker(page, 'silence')).toHaveAttribute('data-on', 'false');
  await expect(marker(page, 'silence')).toHaveAttribute('data-on', 'true', SLOW_EXPECT);
  await expect(page.locator('#loop-status')).toHaveText('oh.');
  expect(await collected(page)).toContain('silence');

  // Space brings back the exact previous set
  await page.keyboard.press('Space');
  await expect(stage).toHaveAttribute('data-node-count', '3');
  await expect(marker(page, 'silence')).toHaveAttribute('data-on', 'false');
  await page.waitForTimeout(400);
  expect(await loopCode(page)).toBe(before);
  await expect(page.locator('#loop-status')).not.toHaveText('oh.');
});

test('SILENCE: reached by removing every node, the first tap restores instead of placing', async ({ page }) => {
  await page.goto('/');
  const stage = page.locator('#stage');
  await stage.focus();
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(350);
  }
  await loopCode(page);
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await expect(stage).toHaveAttribute('data-node-count', '1');
  // the set on the ring just before it went empty is the one that comes back
  await page.waitForTimeout(300);
  const before = await loopCode(page);
  expect(flagsOf(before).n).toBe(1);
  await page.keyboard.press('Backspace');
  await expect(stage).toHaveAttribute('data-node-count', '0');
  await expect(marker(page, 'silence')).toHaveAttribute('data-on', 'true', SLOW_EXPECT);

  // a tap on the band would normally place a node; here it restores
  await tapRing(page, 0.5);
  await expect(stage).toHaveAttribute('data-node-count', '1');
  await page.waitForTimeout(400);
  expect(await loopCode(page)).toBe(before);
  await expect(marker(page, 'silence')).toHaveAttribute('data-on', 'false');
});

/* ------------------------------------------------------------ REVERSE */

test('REVERSE: drag the head backwards 340°, it persists, Shift+← held undoes it', async ({ page }) => {
  await page.goto('/');
  await page.locator('#stage').focus();
  await loopCode(page);
  await expect(marker(page, 'reverse')).toHaveAttribute('data-on', 'false');

  // The gesture runs inside the page: find the head on the ring layer, press
  // on it, and drag back 355° in a second. Nothing between the read and the
  // press can move the head. The head is painted last, opaque, in
  // --color-loop-accent-hi, so its pixels carry exactly that colour, opaque,
  // whatever the comet trail has left underneath (the trail is translucent,
  // and in the light theme it shares the head's hue); the head is the
  // circular mean of the ring samples that match it.
  await page.evaluate(async ({ turns, steps }) => {
    const ring = document.getElementById('loop-ring') as HTMLCanvasElement;
    const stage = document.getElementById('stage') as HTMLElement;
    const cs = getComputedStyle(document.documentElement);
    const R = parseFloat(cs.getPropertyValue('--ring-r'));
    const cx = parseFloat(cs.getPropertyValue('--ring-cx'));
    const cy = parseFloat(cs.getPropertyValue('--ring-cy'));
    const hex = cs.getPropertyValue('--color-loop-accent-hi').trim();
    const want = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const ctx = ring.getContext('2d')!;
    const dpr = ring.width / ring.clientWidth;
    const img = ctx.getImageData(0, 0, ring.width, ring.height).data;
    const N = 1440;
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < N; i++) {
      const a = i / N;
      for (const dr of [-1, 0, 1]) {
        const x = Math.round((cx + (R + dr) * Math.sin(a * Math.PI * 2)) * dpr);
        const y = Math.round((cy - (R + dr) * Math.cos(a * Math.PI * 2)) * dpr);
        const k = (y * ring.width + x) * 4;
        const diff =
          Math.abs((img[k] ?? 0) - (want[0] as number)) +
          Math.abs((img[k + 1] ?? 0) - (want[1] as number)) +
          Math.abs((img[k + 2] ?? 0) - (want[2] as number));
        if (diff <= 6 && (img[k + 3] ?? 0) === 255) {
          sx += Math.sin(a * Math.PI * 2);
          sy += Math.cos(a * Math.PI * 2);
        }
      }
    }
    if (sx === 0 && sy === 0) throw new Error('the sweep head was not found on the ring layer');
    const head = (Math.atan2(sx, sy) / (Math.PI * 2) + 1) % 1;
    const rect = stage.getBoundingClientRect();
    const fire = (type: string, a: number) =>
      ring.dispatchEvent(
        new PointerEvent(type, {
          clientX: rect.left + cx + R * Math.sin(a * Math.PI * 2),
          clientY: rect.top + cy - R * Math.cos(a * Math.PI * 2),
          pointerId: 9,
          pointerType: 'mouse',
          isPrimary: true,
          bubbles: true,
          cancelable: true,
          button: 0,
          buttons: 1,
        }),
      );
    fire('pointerdown', head);
    for (let k = 1; k <= steps; k++) {
      fire('pointermove', head - (turns * k) / steps);
      await new Promise((r) => setTimeout(r, 25));
    }
    fire('pointerup', head - turns);
  }, { turns: 355 / 360, steps: 40 });

  await expect(marker(page, 'reverse')).toHaveAttribute('data-on', 'true');
  expect(await collected(page)).toContain('reverse');
  // the node the press put under the head was the gesture's, and is gone
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '0');
  await expectFlag(page, 'reverse', true);

  // persists across a reload
  await page.reload();
  await page.locator('#stage').focus();
  await expect(marker(page, 'reverse')).toHaveAttribute('data-on', 'true', SLOW_EXPECT);
  await expectFlag(page, 'reverse', true);

  // keyboard: Shift+← held for one revolution flips it back, and never
  // changes rooms
  await page.keyboard.down('Shift');
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(3000);
  await expect(marker(page, 'reverse')).toHaveAttribute('data-on', 'true');
  await expect(marker(page, 'reverse')).toHaveAttribute('data-on', 'false', SLOW_EXPECT);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.up('Shift');
  await expect(page.locator('.room-shell[data-slug="origin"]')).toHaveAttribute('data-active', 'true');
  await expectFlag(page, 'reverse', false);
});

/* ------------------------------------------------------------ SLOW */

test('SLOW: Shift+S, it persists, a hold at the centre undoes it', async ({ page }) => {
  await page.goto('/');
  const stage = page.locator('#stage');
  await stage.focus();
  await loopCode(page);
  await expect(marker(page, 'slow')).toHaveAttribute('data-on', 'false');

  await page.keyboard.press('Shift+S');
  await expect(marker(page, 'slow')).toHaveAttribute('data-on', 'true');
  // the sound petal was not what Shift+S meant
  await expect(page.locator('[data-control="sound"]')).toHaveAttribute('aria-pressed', 'false');
  expect(await collected(page)).toContain('slow');
  await expectFlag(page, 'slow', true);

  // persists across a reload
  await page.reload();
  await stage.focus();
  await expect(marker(page, 'slow')).toHaveAttribute('data-on', 'true', SLOW_EXPECT);
  await expectFlag(page, 'slow', true);

  // press and hold the centre for 1200 ms
  const g = await ringGeometry(page);
  await page.mouse.move(g.cx, g.cy);
  await page.mouse.down();
  await page.waitForTimeout(600);
  await expect(marker(page, 'slow')).toHaveAttribute('data-on', 'true');
  await expect(marker(page, 'slow')).toHaveAttribute('data-on', 'false', SLOW_EXPECT);
  await page.mouse.up();
  await expectFlag(page, 'slow', false);
  // the hold placed nothing: the centre is reserved
  await expect(stage).toHaveAttribute('data-node-count', '0');
});

/* ------------------------------------------------------------ 144 */

test('144: twelve visits to all twelve rooms turns the ring into a clock face', async ({ page }) => {
  const visits: Record<string, number> = {};
  const rooms = ['origin', 'pulse', 'tone', 'trail', 'swarm', 'mirror', 'growth', 'orbit', 'loom', 'wear', 'garden', 'return'];
  for (const slug of rooms) visits[slug] = 12;
  await page.addInitScript(
    ({ key, visits, rooms }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          v: 1,
          visited: rooms,
          visits,
          collected: [],
          maxDepth: 0,
          kept: [],
          lastLoop: null,
          returns: 0,
          sound: false,
          motion: 'auto',
          slow: false,
          reverse: false,
        }),
      );
    },
    { key: STORAGE_KEY, visits, rooms },
  );
  await page.goto('/');
  await expect(marker(page, '144')).toHaveAttribute('data-on', 'true', SLOW_EXPECT);
  expect(await collected(page)).toContain('144');

  // a tap at the centre turns the face off and on again
  const g = await ringGeometry(page);
  await page.mouse.click(g.cx, g.cy);
  await expect(marker(page, '144')).toHaveAttribute('data-on', 'false');
  await page.mouse.click(g.cx, g.cy);
  await expect(marker(page, '144')).toHaveAttribute('data-on', 'true');
});

test('144: eleven visits are not twelve', async ({ page }) => {
  const visits: Record<string, number> = {};
  const rooms = ['origin', 'pulse', 'tone', 'trail', 'swarm', 'mirror', 'growth', 'orbit', 'loom', 'wear', 'garden', 'return'];
  for (const slug of rooms) visits[slug] = 12;
  visits.wear = 11;
  await page.addInitScript(
    ({ key, visits, rooms }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({ v: 1, visited: rooms, visits, collected: [], maxDepth: 0, kept: [], lastLoop: null, returns: 0, sound: false, motion: 'auto', slow: false, reverse: false }),
      );
    },
    { key: STORAGE_KEY, visits, rooms },
  );
  await page.goto('/');
  await expect(marker(page, '144')).toHaveAttribute('data-on', 'false', SLOW_EXPECT);
  await page.waitForTimeout(2500);
  await expect(marker(page, '144')).toHaveAttribute('data-on', 'false');
  expect(await collected(page)).toEqual([]);
});

/* ------------------------------------------------------------ THE TWIN */

test('THE TWIN: a loop that matches a garden loop under rotation locks both rings', async ({ page }) => {
  const index = GARDEN_SEEDS.findIndex((c) => (decodeLoop(c)?.nodes.length ?? 0) >= 3);
  expect(index).toBeGreaterThanOrEqual(0);
  const seed = decodeLoop(GARDEN_SEEDS[index] as string)!;
  // the same loop, turned a third of the way round
  const rotated = seed.nodes.map((n) => ({ ...n, a: (n.a + 0.3) % 1 }));
  const code = encodeLoop(rotated);

  await page.goto(`/?s=garden#l=${code}`);
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', String(seed.nodes.length));
  await expect(marker(page, 'twin')).toHaveAttribute('data-on', 'true', SLOW_EXPECT);
  expect(await collected(page)).toContain('twin');
});

test('THE TWIN: a loop that only nearly matches does not', async ({ page }) => {
  const index = GARDEN_SEEDS.findIndex((c) => (decodeLoop(c)?.nodes.length ?? 0) >= 3);
  const seed = decodeLoop(GARDEN_SEEDS[index] as string)!;
  // the same turn, with one node carried to the far side of the ring
  const off = seed.nodes.map((n, i) => ({ ...n, a: (n.a + 0.3 + (i === 1 ? 0.5 : 0)) % 1 }));
  const code = encodeLoop(off);
  await page.goto(`/?s=garden#l=${code}`);
  await expect(marker(page, 'twin')).toHaveAttribute('data-on', 'false', SLOW_EXPECT);
  await page.waitForTimeout(1500);
  await expect(marker(page, 'twin')).toHaveAttribute('data-on', 'false');
  expect(await collected(page)).toEqual([]);
});
