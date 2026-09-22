/**
 * tests/navigation.spec.ts — the night, the ask bar, and the keyboard.
 * **OWNED BY WP-C.** Spec: §C.7, §C.8, §C.15, §F.3, §H.2.
 *
 * The four things this file exists to stop from regressing, all of which are
 * rubric deductions the outgoing site actually lost points to:
 *
 *   - a slot pushed off-screen at 200 % zoom (`09` §F1);
 *   - a slot that does not hit-test to itself, at any of the seven viewports;
 *   - a state you can only tell apart by its colour (§C.7, §F.4);
 *   - the one fixed control moving between accounts (§H.2).
 */

import {
  test,
  expect,
  ACCOUNT_SLUGS,
  VIEWPORTS,
  activeAccount,
  type Page,
} from './fixtures';

/** The night belonging to the account currently on screen. */
function night(page: Page, slug: string) {
  return page.locator(`#section-${slug} .night`);
}

/* --------------------------------------------------------- the three states */

test('every slot carries one of exactly three states, and navigates to itself', async ({
  page,
}) => {
  await page.goto('/');
  const states = await night(page, 'dog')
    .locator('> a')
    .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.state));
  expect(states).toHaveLength(ACCOUNT_SLUGS.length);
  for (const s of states) expect(['unread', 'read', 'changed']).toContain(s);

  await night(page, 'dog').locator('> a[data-slug="switch"]').click();
  await expect(page.locator('#section-switch')).toBeVisible();
  expect(await activeAccount(page)).toBe('switch');
});

/**
 * §C.7, §F.4: never colour alone. The document is rendered in GREYSCALE and
 * the same slot is photographed in each of the three states with its label
 * hidden, so the only thing in the frame is the mark. If two of those three
 * pictures came out identical, the difference between them was hue and a
 * reader who cannot see hue has no navigation.
 */
test('the three states survive greyscale', async ({ page }) => {
  await page.goto('/');
  await page.addStyleTag({
    content: `html { filter: grayscale(1) !important; }
              .night .label, .night .gap { visibility: hidden !important; }`,
  });
  const slot = page.locator('#section-dog .night > a[data-slug="river"]');
  const shots: Record<string, string> = {};
  for (const state of ['unread', 'read', 'changed'] as const) {
    await slot.evaluate((el, s) => {
      (el as HTMLElement).dataset.state = s;
    }, state);
    shots[state] = (await slot.screenshot()).toString('base64');
  }
  expect(
    new Set(Object.values(shots)).size,
    'two of unread / read / changed are the same picture in greyscale',
  ).toBe(3);
});

/** And the shapes are the ones §C.7 names: a fill, and a second bar. */
test('read is a fill and changed is a second bar', async ({ page }) => {
  await page.goto('/');
  const shapes = await page.evaluate(() => {
    const a = document.querySelector<HTMLElement>('#section-dog .night > a');
    const mark = a?.querySelector('.mark') as HTMLElement;
    const read = (state: string) => {
      (a as HTMLElement).dataset.state = state;
      const m = getComputedStyle(mark);
      const bar = getComputedStyle(mark, '::after');
      const alpha = /rgba?\(([^)]+)\)/.exec(m.backgroundColor);
      const parts = (alpha?.[1] ?? '0,0,0,0').split(',').map((n) => parseFloat(n));
      return {
        filled: (parts[3] ?? 1) > 0,
        bar: bar.content !== 'none' && parseFloat(bar.height || '0') > 0,
      };
    };
    return { unread: read('unread'), read: read('read'), changed: read('changed') };
  });
  expect(shapes.unread, 'unread is a hollow ring').toEqual({ filled: false, bar: false });
  expect(shapes.read, 'read is a solid mark').toEqual({ filled: true, bar: false });
  expect(shapes.changed, 'changed is a solid mark AND a second bar').toEqual({
    filled: true,
    bar: true,
  });
});

/** The state has to be in the accessibility tree too, and said ONCE (§C.7). */
test('a slot says its title and its state exactly once', async ({ page }) => {
  await page.goto('/');
  const here = night(page, 'dog').locator('> a[data-slug="dog"]');
  // `.label` and `.gap` are aria-hidden; the u-sr span is the whole name.
  await expect(here).toHaveAccessibleName('the dog — read');
  await expect(here).toHaveAttribute('aria-current', 'page');
  await expect(night(page, 'dog').locator('> a[data-slug="river"]')).toHaveAccessibleName(
    'the river',
  );
});

/* ------------------------------------------------- geometry at every viewport */

test('every slot hit-tests to itself at all seven viewports', async ({ page }) => {
  for (const width of VIEWPORTS) {
    await page.setViewportSize({ width, height: width < 500 ? 568 : 768 });
    await page.goto('/');
    const wrong = await page.evaluate(() => {
      const bad: string[] = [];
      for (const a of document.querySelectorAll<HTMLAnchorElement>('#section-dog .night > a')) {
        const r = a.getBoundingClientRect();
        // scrolled into view first, so elementFromPoint is asked a fair question
        a.scrollIntoView({ block: 'center' });
        const box = a.getBoundingClientRect();
        const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        if (!hit || hit.closest('a') !== a) bad.push(`${a.dataset.slug} (${Math.round(r.width)}x${Math.round(r.height)})`);
      }
      return bad;
    });
    expect(wrong, `slots that do not hit-test to themselves at ${width}`).toEqual([]);
  }
});

test('no horizontal overflow, and no slot off-screen, at any viewport', async ({ page }) => {
  for (const width of VIEWPORTS) {
    await page.setViewportSize({ width, height: width < 500 ? 568 : 768 });
    await page.goto('/');
    const r = await page.evaluate(() => {
      const de = document.documentElement;
      const out: string[] = [];
      for (const a of document.querySelectorAll<HTMLAnchorElement>('#section-dog .night > a')) {
        const b = a.getBoundingClientRect();
        // The night is IN FLOW, so vertical position is a scroll away and only
        // horizontal escape is a defect.
        if (b.left < -0.5 || b.right > de.clientWidth + 0.5) out.push(a.dataset.slug ?? '?');
      }
      return { overflow: de.scrollWidth - de.clientWidth, out };
    });
    expect(r.overflow, `${width} px overflows horizontally`).toBeLessThanOrEqual(0);
    expect(r.out, `slots off-screen at ${width} px`).toEqual([]);
  }
});

test('the night is in flow, never fixed, so nothing can push it away', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/');
  expect(
    await night(page, 'dog').evaluate((el) => getComputedStyle(el).position),
  ).not.toBe('fixed');
});

/* -------------------------------------------------------------- the ask bar */

test('the ask bar names its destination and never relocates', async ({ page }) => {
  await page.goto('/');
  const bar = page.locator('.ask-bar:visible');
  const first = await bar.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { right: Math.round(r.right), bottom: Math.round(r.bottom), h: Math.round(r.height) };
  });

  for (const slug of ACCOUNT_SLUGS) {
    await page.goto(`/?s=${slug}`);
    await expect(page.locator(`#section-${slug}`)).toBeVisible();
    const here = await page.locator('.ask-bar:visible').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { right: Math.round(r.right), bottom: Math.round(r.bottom), h: Math.round(r.height) };
    });
    // The desktop card grows LEFTWARD with the ask string (`12` §D.7), so the
    // right edge, the bottom edge and the height are the fixed box, not width.
    expect(here, `the bar moved in ${slug}`).toEqual(first);
  }
});

test('the ask bar is the ONE fixed element, and it lets the page through', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/');
  const fixed = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('body *')]
      .filter((e) => getComputedStyle(e).position === 'fixed')
      .filter((e) => e.getClientRects().length > 0)
      .map((e) => e.id || e.className),
  );
  // the ambient canvas is fixed too, but it is decorative and aria-hidden
  expect(fixed.filter((c) => c !== 'ambient')).toEqual(['ask-bar']);

  const pe = await page.locator('.ask-bar:visible').evaluate((el) => ({
    bar: getComputedStyle(el).pointerEvents,
    kids: [...el.children].map((c) => getComputedStyle(c).pointerEvents),
  }));
  expect(pe.bar, 'the bar must not eat the page (`08` §6)').toBe('none');
  for (const k of pe.kids) expect(k).toBe('auto');
});

test('the hub reserves its box and prints no zero', async ({ page }) => {
  await page.goto('/');
  const hub = page.locator('.ask-bar:visible .hub');
  await expect(hub).toHaveText('');
  const box = await hub.boundingBox();
  expect(box?.width ?? 0, 'the hub box is reserved at n = 0').toBeGreaterThan(8);
});

/* ----------------------------------------------------------------- at rest */

/**
 * §H.2: `getAnimations()` is empty one second after load, in every project.
 * A permanently running animation anywhere — the ring build had one on
 * `:root` — fails this, and it is the assertion that keeps every animation on
 * this site finite.
 */
test('nothing is animating a second after load', async ({ page }) => {
  for (const slug of ['dog', 'four-seconds']) {
    await page.goto(`/?s=${slug}`);
    await page.waitForTimeout(1100);
    const running = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => a.playState === 'running')
        .map((a) => (a as CSSAnimation).animationName ?? 'anonymous'),
    );
    expect(running, `${slug} is still animating at rest`).toEqual([]);
  }
});

/**
 * And the same for the ambient layer, which `getAnimations()` cannot see.
 * The figure runs for ONE revolution on entry and then stops the clock, so a
 * reader who has settled into a paragraph is paying for no frames at all.
 * This is a departure from §C.16's perpetual figure and it is the whole
 * reason the departure is worth having, so it is measured.
 */
test('the ambient layer stops, and the reader reads in peace', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __raf: number };
    w.__raf = 0;
    const real = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      w.__raf += 1;
      return real(cb);
    };
  });
  await page.goto('/');
  const count = () => page.evaluate(() => (window as unknown as { __raf: number }).__raf);
  // past the idle mount and one full revolution of the four seconds
  await page.waitForTimeout(6500);
  const settled = await count();
  expect(settled, 'the figure never ran at all').toBeGreaterThan(10);
  await page.waitForTimeout(1500);
  expect(await count(), 'the clock is still running while the reader reads').toBe(settled);
});

/** §C.16: the swap is a cross-fade, and it is never applied on load. */
test('the account cross-fade happens on a swap and not on arrival', async ({ page }) => {
  await page.goto('/?s=kettle');
  await expect(page.locator('#section-kettle')).toBeVisible();
  expect(
    await page.locator('#section-kettle').evaluate((el) => (el as HTMLElement).dataset.swap),
    'the first viewport must never be painted from opacity 0',
  ).toBeUndefined();

  await night(page, 'kettle').locator('> a[data-slug="clock"]').click();
  await expect(page.locator('#section-clock')).toBeVisible();

  // It is set for the swap and cleared again, so the fade runs once and
  // leaves nothing behind. Polled rather than timed: on a shared CPU the
  // whole chain — click, push, entry effect, attribute — can take longer than
  // the fade itself, and what matters is that it settles, not when.
  await expect
    .poll(
      async () =>
        page.evaluate(() => ({
          swap: [...document.querySelectorAll('.account[data-swap]')].length,
          running: document.getAnimations().filter((a) => a.playState === 'running').length,
        })),
      { timeout: 5000 },
    )
    .toEqual({ swap: 0, running: 0 });
});

/* -------------------------------------------------------------- the history */

test('a slot pushes, and Back leaves in one press', async ({ page }) => {
  await page.goto('/');
  await night(page, 'dog').locator('> a[data-slug="river"]').click();
  await expect(page.locator('#section-river')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#section-dog')).toBeVisible();
  expect(await activeAccount(page)).toBe('dog');
});

test('the ask control pushes too, and Back reverses it', async ({ page }) => {
  await page.goto('/?s=moth');
  await expect(page.locator('#section-moth')).toBeVisible();
  await page.locator('.ask-bar:visible .ask-text').click();
  await expect(page.locator('#section-river')).toBeVisible();
  await page.goBack();
  expect(await activeAccount(page)).toBe('moth');
});

/* -------------------------------------------------------------- the keyboard */

test('the keyboard map of §C.15, and nothing else', async ({ page }) => {
  await page.goto('/');
  const body = page.locator('body');

  await body.click({ position: { x: 2, y: 2 } });
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#section-lamp')).toBeVisible();

  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#section-dog')).toBeVisible();

  await page.keyboard.press('5');
  await expect(page.locator('#section-river')).toBeVisible();

  await page.keyboard.press('=');
  await expect(page.locator('#section-four-seconds')).toBeVisible();
});

test('a digit with a modifier is the browser\'s, not ours', async ({ page }) => {
  await page.goto('/');
  await page.locator('body').click({ position: { x: 2, y: 2 } });
  await page.keyboard.press('Control+3');
  expect(await activeAccount(page)).toBe('dog');
});

test('Escape closes the open asides in this account and nothing else', async ({ page }) => {
  await page.goto('/');
  const open = page.locator('#section-dog details.aside[open]');
  await expect(open).toHaveCount(1);
  await page.locator('#section-dog details.aside:not([open]) > summary').first().click();
  await expect(open).toHaveCount(2);
  await page.locator('body').click({ position: { x: 2, y: 2 } });
  await page.keyboard.press('Escape');
  await expect(open).toHaveCount(0);
  expect(await activeAccount(page)).toBe('dog');
});

/* ------------------------------------------------------------ with no script */

test.describe('with JavaScript disabled', () => {
  test.use({ javaScriptEnabled: false });

  test('every slot is a real link to a real route', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page
      .locator('#section-dog .night > a')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs).toEqual(ACCOUNT_SLUGS.map((s) => `/?s=${s}`));

    await page.locator('#section-dog .night > a[data-slug="radio"]').click();
    await page.waitForURL(/\?s=radio/);
    await expect(page.locator('#section-radio')).toBeVisible();
    // and the whole document is still there to read
    await expect(page.locator('#section-dog')).toBeVisible();
  });

  test('the ask control works, and one bar is shown', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.ask-bar:visible')).toHaveCount(1);
    await page.locator('.ask-bar:visible .ask-text').click();
    await page.waitForURL(/\?s=lamp/);
  });
});
