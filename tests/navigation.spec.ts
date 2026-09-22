/**
 * tests/navigation.spec.ts — the Ringway, the corridor, the Next Arc, Keep
 * and Share, per §C.5, §C.6, §C.7, §C.10, §C.11, §C.12 and §G WP3.
 *
 * Owned by WP3. `test` and `expect` come from ./fixtures, which asserts zero
 * console errors, zero page errors and no response >= 400 on every test.
 */

import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { ROOM_SLUGS, expect, ringGeometry, test } from './fixtures';
import { decodeLoop, encodeLoop } from '../src/lib/share';
import { mulberry32 } from '../src/lib/rng';

const active = (page: Page, slug: string) =>
  expect(page.locator(`.room-shell[data-slug="${slug}"]`)).toHaveAttribute('data-active', 'true');

const notch = (page: Page, slug: string) => page.locator(`nav[aria-label="rooms"] a[href="/?s=${slug}"]`);

/** A passive room change: the URL is replaced and the store re-reads it, as a completed trick would. */
async function passiveChange(page: Page, slug: string) {
  await page.evaluate((s) => {
    window.history.replaceState(null, '', `/?s=${s}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, slug);
  await active(page, slug);
}

async function historyLength(page: Page) {
  return page.evaluate(() => window.history.length);
}

/* ------------------------------------------------------------ push / replace */

test('Back returns to the previous deliberate room in ONE press after ten passive changes', async ({
  page,
}) => {
  await page.goto('/?s=origin');
  await page.locator('#stage').focus();
  const before = await historyLength(page);

  await page.keyboard.press('ArrowRight'); // deliberate → pushState
  await active(page, 'pulse');
  expect(await historyLength(page)).toBe(before + 1);

  const passive = ['tone', 'trail', 'swarm', 'mirror', 'growth', 'orbit', 'loom', 'wear', 'garden', 'return'];
  for (const slug of passive) await passiveChange(page, slug);
  // passive changes never create history entries (§C.10)
  expect(await historyLength(page)).toBe(before + 1);

  await page.goBack();
  await active(page, 'origin');
});

test('a Ringway click and the Next Arc are deliberate: one history entry each', async ({ page }) => {
  await page.goto('/?s=pulse');
  const before = await historyLength(page);
  await notch(page, 'tone').click();
  await active(page, 'tone');
  await expect(page).toHaveURL(/\/\?s=tone$/);
  expect(await historyLength(page)).toBe(before + 1);

  await page.locator('a.next-arc').click();
  await active(page, 'trail');
  await expect(page).toHaveURL(/\/\?s=trail$/);
  expect(await historyLength(page)).toBe(before + 2);

  await page.goBack();
  await active(page, 'tone');
  await page.goBack();
  await active(page, 'pulse');
});

test('the share hash is never written to the address bar by the site itself', async ({ page }) => {
  await page.goto('/?s=origin#l=AU4ggICjwFc');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '3');
  await page.locator('#stage').focus();
  await page.keyboard.press('ArrowRight');
  await active(page, 'pulse');
  // the inbound hash travels with the visitor (pushState keeps it) but nothing
  // the site does ever adds one
  await page.keyboard.press('Space');
  await page.locator('[data-control="share"]').click();
  await expect(page).toHaveURL(/\/\?s=pulse(#l=AU4ggICjwFc)?$/);
});

/* ------------------------------------------------------------ real links, no JS */

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every notch is a real link that navigates to its room', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav[aria-label="rooms"]');
    await expect(nav.locator('a')).toHaveCount(ROOM_SLUGS.length);
    for (const slug of ROOM_SLUGS) {
      await expect(nav.locator(`a[href="/?s=${slug}"]`)).toHaveCount(1);
    }
    await notch(page, 'orbit').click();
    await expect(page).toHaveURL(/\/\?s=orbit$/);
    await expect(page.locator('#section-orbit')).toBeVisible();
  });

  test('the Next Arc and the shell links work without JS too', async ({ page }) => {
    // the no-JS document is one static page: the arc leads out of ORIGIN and
    // every shell carries its own link to the next room
    await page.goto('/?s=loom');
    await page.locator('#section-loom a.next-link').click();
    await expect(page).toHaveURL(/\/\?s=wear$/);
    await page.locator('a.next-arc').click();
    await expect(page).toHaveURL(/\/\?s=pulse$/);
  });
});

/* ------------------------------------------------------------ the codec (§C.7) */

test('the share codec round-trips byte-exactly over 1000 random node sets', () => {
  const rnd = mulberry32(0x100c);
  for (let iter = 0; iter < 1000; iter++) {
    const n = Math.floor(rnd() * 25); // 0..24
    const nodes = [];
    for (let i = 0; i < n; i++) {
      nodes.push({
        id: `n${i}`,
        a: Math.floor(rnd() * 256) / 256, // quantized on commit (§C.3)
        r: Math.floor(rnd() * 16),
        v: Math.floor(rnd() * 16),
        born: 0,
      });
    }
    const reverse = rnd() < 0.5;
    const slow = rnd() < 0.5;
    const code = encodeLoop(nodes, { reverse, slow });
    expect(code, `iteration ${iter}: base64url only`).toMatch(/^[A-Za-z0-9_-]*$/);
    const back = decodeLoop(code);
    expect(back, `iteration ${iter} must decode`).not.toBeNull();
    expect(back!.nodes.length).toBe(n);
    expect(back!.reverse).toBe(reverse);
    expect(back!.slow).toBe(slow);
    for (let i = 0; i < n; i++) {
      expect(back!.nodes[i]!.a).toBe(nodes[i]!.a);
      expect(back!.nodes[i]!.r).toBe(nodes[i]!.r);
      expect(back!.nodes[i]!.v).toBe(nodes[i]!.v);
    }
    // and the re-encoding of the decoded set is the same bytes
    expect(encodeLoop(back!.nodes, { reverse, slow })).toBe(code);
  }
});

test('`send your loop` copies a link that restores the same loop, byte for byte', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __copied: string[] };
    w.__copied = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (text: string) => {
          w.__copied.push(text);
          return Promise.resolve();
        },
      },
    });
  });
  await page.goto('/?s=tone');
  await page.locator('#stage').focus();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(90);
  }
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '4');

  await page.locator('[data-control="share"]').click();
  await expect(page.locator('#loop-status')).toContainText('copied. it travels.');
  const first = await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied[0]);
  expect(first).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/\?s=tone#l=[A-Za-z0-9_-]+$/);
  const code = first!.split('#l=')[1]!;
  expect(code.length).toBe(14); // 4 nodes = 10 bytes = 14 chars (§C.7)

  await page.goto(first!);
  await active(page, 'tone');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '4');
  await expect(page.locator('#loop-status')).toContainText('someone left this here');

  await page.locator('[data-control="share"]').click();
  const again = await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied[0]);
  expect(again).toBe(first);
});

/* ------------------------------------------------------------ focus (§C.11) */

test('a deliberate navigation moves focus to the new room h2 and announces it', async ({ page }) => {
  await page.goto('/?s=pulse');
  await notch(page, 'tone').click();
  await active(page, 'tone');
  await expect(page.locator('#h-tone')).toBeFocused();
  await expect(page.locator('#loop-status[aria-live="polite"]')).toContainText('tone');

  // and the keyboard keeps working from the heading (06-wp0-notes A.2)
  await page.keyboard.press('ArrowRight');
  await active(page, 'trail');
  await expect(page.locator('#h-trail')).toBeFocused();
});

test('a passive navigation never moves focus', async ({ page }) => {
  await page.goto('/?s=pulse');
  await page.locator('#stage').focus();
  await passiveChange(page, 'tone');
  await passiveChange(page, 'trail');
  await expect(page.locator('#stage')).toBeFocused();
  await expect(page.locator('#h-trail')).not.toBeFocused();
});

/* ------------------------------------------------------------ wheel (§J.5) */

test('wheel events change nothing — no room, no URL, no scroll', async ({ page }) => {
  await page.goto('/?s=tone');
  await page.locator('#stage').focus();
  const url = page.url();
  const g = await ringGeometry(page);
  await page.mouse.move(g.cx, g.cy);
  for (let i = 0; i < 10; i++) await page.mouse.wheel(0, 600);
  for (let i = 0; i < 10; i++) await page.mouse.wheel(0, -600);
  // over the Ringway too
  const nav = await page.locator('nav[aria-label="rooms"]').boundingBox();
  if (nav) {
    await page.mouse.move(nav.x + nav.width / 2, nav.y + nav.height / 2);
    for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 500);
  }
  await page.waitForTimeout(300);
  await active(page, 'tone');
  expect(page.url()).toBe(url);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

/* ------------------------------------------------------------ keys and swipe */

test('Shift+Arrow and Shift+S are left to the hidden destinations', async ({ page }) => {
  await page.goto('/?s=tone');
  await page.locator('#stage').focus();
  await page.keyboard.press('Shift+ArrowLeft');
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+S');
  await page.waitForTimeout(200);
  await active(page, 'tone');
});

test('a vertical touch swipe off the band moves through the corridor (push)', async ({ page }) => {
  await page.goto('/?s=tone');
  const before = await historyLength(page);
  const swipe = async (dir: 1 | -1) =>
    page.evaluate(async (d) => {
      const stage = document.getElementById('stage')!;
      const rect = stage.getBoundingClientRect();
      const x = rect.left + 18;
      const y0 = rect.top + rect.height * 0.62;
      const mk = (type: string, y: number) =>
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 7,
          pointerType: 'touch',
          isPrimary: true,
          clientX: x,
          clientY: y,
        });
      stage.dispatchEvent(mk('pointerdown', y0));
      await new Promise((r) => setTimeout(r, 60));
      stage.dispatchEvent(mk('pointermove', y0 - 90 * d));
      await new Promise((r) => setTimeout(r, 40));
      stage.dispatchEvent(mk('pointerup', y0 - 160 * d));
    }, dir);

  await swipe(1); // up = forward
  await active(page, 'trail');
  expect(await historyLength(page)).toBe(before + 1);
  await swipe(-1); // down = back
  await active(page, 'tone');
  expect(await historyLength(page)).toBe(before + 2);
});

/* ------------------------------------------------------------ the Ringway (§C.5) */

test('endowed progress: ORIGIN is lit on arrival, the rest are dark, and state is text too', async ({
  page,
}) => {
  await page.goto('/');
  await expect(notch(page, 'origin')).toHaveAttribute('data-visited', 'true');
  await expect(notch(page, 'origin')).toHaveAttribute('aria-current', 'page');
  await expect(notch(page, 'origin')).toContainText('origin — visited');
  for (const slug of ROOM_SLUGS.slice(1)) {
    await expect(notch(page, slug)).toHaveAttribute('data-visited', 'false');
    await expect(notch(page, slug)).toContainText(`${slug} — not yet visited`);
  }
  // no hub counter until a hidden destination is found
  await expect(page.locator('nav[aria-label="rooms"] .hub')).toHaveCount(0);
});

test('the Ringway fades in on the fifth node (§B) and is present in the tree before that', async ({
  page,
}) => {
  await page.goto('/');
  const nav = page.locator('nav[aria-label="rooms"]');
  await expect(nav).toHaveAttribute('data-shown', 'false');
  await expect(nav.locator('a')).toHaveCount(12);
  await page.locator('#stage').focus();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(60);
  }
  await expect(nav).toHaveAttribute('data-shown', 'true');
  await expect(page.locator('#loop-status')).toContainText('there are twelve of these', { timeout: 6000 });
});

test('a room locks in after 3 s and one revolution (rule a)', async ({ page }) => {
  await page.goto('/?s=pulse');
  await expect(notch(page, 'pulse')).toHaveAttribute('data-visited', 'false');
  await expect(notch(page, 'pulse')).toHaveAttribute('data-visited', 'true', { timeout: 10_000 });
  await expect(notch(page, 'pulse')).toContainText('pulse — visited');
});

test('placing a node in a room counts as a visit at once (rule b)', async ({ page }) => {
  await page.goto('/?s=tone');
  await expect(notch(page, 'tone')).toHaveAttribute('data-visited', 'false');
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await expect(notch(page, 'tone')).toHaveAttribute('data-visited', 'true', { timeout: 1500 });
  // the lock-in ran on this notch
  await expect(notch(page, 'tone')).toHaveAttribute('data-lock', 'true');
  await expect(notch(page, 'tone')).not.toHaveAttribute('data-lock', 'true', { timeout: 2000 });
});

test('the hub shows n/5 in numerals once a hidden destination has been found', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'loop:v1',
      JSON.stringify({ v: 1, visited: ['origin'], visits: { origin: 1 }, collected: ['slow'] }),
    );
  });
  await page.goto('/');
  const hub = page.locator('nav[aria-label="rooms"] .hub');
  await expect(hub).toHaveText('1/5');
  await expect(hub).toHaveAttribute('data-found', '1');
});

test('visited state persists across a reload', async ({ page }) => {
  await page.goto('/?s=mirror');
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await expect(notch(page, 'mirror')).toHaveAttribute('data-visited', 'true');
  await page.waitForTimeout(700); // the debounced write
  await page.goto('/');
  await expect(notch(page, 'mirror')).toHaveAttribute('data-visited', 'true');
  await expect(page.locator('nav[aria-label="rooms"]')).toHaveAttribute('data-shown', 'true');
});

/* ------------------------------------------------------------ the Next Arc (§C.11) */

test('the Next Arc names the next room, is a real link, and never relocates', async ({ page }) => {
  await page.goto('/?s=orbit');
  const arc = page.locator('a.next-arc');
  await expect(arc).toHaveAttribute('href', '/?s=loom');
  await expect(arc).toHaveAttribute('data-next', 'loom');
  await expect(arc).toContainText('next room: loom');
  await expect(arc.locator('svg text')).toHaveText('loom');
  const box1 = await arc.boundingBox();
  expect(box1!.height).toBeGreaterThanOrEqual(48);

  await arc.click();
  await active(page, 'loom');
  await expect(arc).toHaveAttribute('href', '/?s=wear');
  const box2 = await arc.boundingBox();
  expect(box2!.x).toBeCloseTo(box1!.x, 0);
  expect(box2!.y).toBeCloseTo(box1!.y, 0);
});

test('the Next Arc escalates after the trick and 4 s idle, and never navigates on its own', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto('/?s=trail');
  const arc = page.locator('a.next-arc');
  await expect(arc).toHaveAttribute('data-escalated', 'false');
  await page.locator('#stage').focus();
  await page.keyboard.press('Space'); // the pen bends when this fires: depth 0.5
  await expect(arc).toHaveAttribute('data-escalated', 'true', { timeout: 15_000 });
  const before = await historyLength(page);
  await page.waitForTimeout(5500);
  await active(page, 'trail');
  expect(await historyLength(page)).toBe(before);
  expect(page.url()).toMatch(/\/\?s=trail$/);
  // any input resets the escalation for the next room
  await arc.click();
  await active(page, 'swarm');
  await expect(arc).toHaveAttribute('data-escalated', 'false');
});

/* ------------------------------------------------------------ keep (§C.6) */

test('`keep this` downloads a PNG from the button, from K, and from a long-press', async ({ page }) => {
  await page.goto('/?s=trail');
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);

  const d1 = page.waitForEvent('download');
  await page.locator('[data-control="keep"]').click();
  const download1 = await d1;
  expect(download1.suggestedFilename()).toMatch(/^loop-\d+-[A-Za-z0-9_-]+\.png$/);

  await page.locator('#stage').focus();
  const d2 = page.waitForEvent('download');
  await page.keyboard.press('k');
  expect((await d2).suggestedFilename()).toMatch(/\.png$/);

  const d3 = page.waitForEvent('download');
  await page.evaluate(async () => {
    const stage = document.getElementById('stage')!;
    const rect = stage.getBoundingClientRect();
    const opts = {
      bubbles: true,
      cancelable: true,
      pointerId: 3,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: rect.left + 14,
      clientY: rect.top + rect.height * 0.5,
    };
    stage.dispatchEvent(new PointerEvent('pointerdown', opts));
    await new Promise((r) => setTimeout(r, 760));
    stage.dispatchEvent(new PointerEvent('pointerup', opts));
  });
  expect((await d3).suggestedFilename()).toMatch(/\.png$/);
});

/* ------------------------------------------------------------ layout and silence */

test('no horizontal overflow at 320 px in any room, with the Ringway shown', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  for (const slug of ['origin', 'trail', 'garden', 'return']) {
    await page.goto(`/?s=${slug}`);
    await page.locator('#stage').focus();
    await page.keyboard.press('Space');
    await page.waitForTimeout(150);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${slug} at 320px`).toBeLessThanOrEqual(0);
    const nav = await page.locator('nav[aria-label="rooms"]').boundingBox();
    expect(nav!.x).toBeGreaterThanOrEqual(0);
    expect(nav!.x + nav!.width).toBeLessThanOrEqual(320);
  }
});

test('walking all twelve rooms through the Next Arc produces zero console output', async ({ page }) => {
  const messages: string[] = [];
  page.on('console', (m) => messages.push(`${m.type()}: ${m.text()}`));
  await page.goto('/?s=origin');
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  for (let i = 0; i < 12; i++) {
    await page.locator('a.next-arc').click();
    await page.waitForTimeout(250);
  }
  await active(page, 'origin');
  await page.waitForTimeout(600);
  expect(messages).toEqual([]);
});

test.describe('a11y @a11y', () => {
  test('the Ringway, Next Arc and controls are clean with the Ringway shown', async ({ page }) => {
    await page.goto('/?s=trail');
    await page.locator('#stage').focus();
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(bad.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('tab order: skip link → stage → sound → motion → keep → share → Ringway → Next Arc', async ({
    page,
  }) => {
    await page.goto('/?s=pulse');
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#stage')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-control="sound"]')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-control="motion"]')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-control="keep"]')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-control="share"]')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(notch(page, 'origin')).toBeFocused();
    for (let i = 0; i < 11; i++) await page.keyboard.press('Tab');
    await expect(notch(page, 'return')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('a.next-arc')).toBeFocused();
    // Enter on the arc is a deliberate act
    await page.keyboard.press('Enter');
    await active(page, 'tone');
    await expect(page.locator('#h-tone')).toBeFocused();
  });
});
