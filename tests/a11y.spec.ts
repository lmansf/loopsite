/**
 * tests/a11y.spec.ts — axe, the keyboard walk and the target geometry.
 * **OWNED BY WP-D.** Spec: §H.2, §C.15, §F.3, §F.4. Tagged @a11y:
 * `pnpm test:e2e` inverts the grep and `pnpm test:a11y` selects it.
 *
 * Three axe passes (`/`, `/` after all twelve accounts, one `/s/<slug>`), the
 * full keyboard walk of §C.15, and the 44 px / 8 px sweep at all seven
 * viewports — 320, 360, 393, 412, 180 (200 % zoom), 1024 and 1440. The
 * spacing floor is the F3 deduction the outgoing site lost a point to and the
 * thumb-zone rule is the F2 one, so both are measured rather than asserted in
 * prose.
 */

import AxeBuilder from '@axe-core/playwright';
import { test, expect, ACCOUNT_SLUGS, VIEWPORTS, type Page } from './fixtures';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function axeIsClean(page: Page, where: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(
    bad.map((v) => `${where}: ${v.id} (${v.impact}) x${v.nodes.length}`),
    `axe on ${where}`,
  ).toEqual([]);
}

/* ------------------------------------------------------------------ axe */

test('zero serious or critical on / @a11y', async ({ page }) => {
  await page.goto('/');
  await axeIsClean(page, '/');
});

test('zero serious or critical on / after all twelve accounts @a11y', async ({ page }) => {
  await page.goto('/');
  for (const slug of ACCOUNT_SLUGS) {
    await page.goto(`/?s=${slug}`);
    await expect(page.locator(`#section-${slug}`)).toBeVisible();
    // one key from each account that has one, so the twelfth pass is the
    // fullest state the site can be in
    const summary = page.locator(`#section-${slug} details.aside:not([open]) > summary`).first();
    if (await summary.count()) await summary.click();
  }
  await page.goto('/');
  await expect(page.locator('#section-dog')).toBeVisible();
  await axeIsClean(page, '/ after twelve accounts');
});

test('zero serious or critical on an alias route @a11y', async ({ page, request }) => {
  // The alias route's whole job is generateMetadata, and it replaceStates to
  // the canonical route the moment JavaScript runs (§C.11) — so with
  // JavaScript on, the page axe can actually settle on is the one the reader
  // lands on. The served document is checked separately, below, which is what
  // a reader without JavaScript gets.
  await page.goto('/s/moth');
  await page.waitForURL(/\?s=moth/);
  await expect(page.locator('#section-moth')).toBeVisible();
  const raw = await (await request.get('/s/moth')).text();
  expect(raw).toContain('id="section-moth"');
  expect(raw).toContain('aria-labelledby="h-moth"');
  await axeIsClean(page, '/s/moth');
});

/* ------------------------------------------------------- the keyboard walk */

test('Tab reaches the skip link first @a11y', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.className ?? '');
  expect(focused).toContain('skip-link');
});

test('the tab order is the one §C.15 fixes, and nothing traps @a11y', async ({ page }) => {
  await page.goto('/?s=lamp');
  await expect(page.locator('#section-lamp')).toBeVisible();

  const stops: string[] = [];
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return 'body';
      if (el.classList.contains('skip-link')) return 'skip';
      if (el.closest('.night')) return 'night';
      if (el.tagName === 'SUMMARY') return 'word';
      if (el.closest('.ask-card')) return 'ask-card';
      if (el.closest('.ask-bar')) return 'ask-bar';
      if (el.closest('.loop-footer')) return 'footer';
      if (el.tagName === 'H2' || el.tagName === 'H1') return 'heading';
      return `other:${el.tagName.toLowerCase()}.${el.className}`;
    });
    stops.push(stop);
    if (stop === 'body' && stops.length > 3) break;
  }

  expect(stops[0]).toBe('skip');
  const first = (name: string) => stops.indexOf(name);
  // The night comes before the prose it navigates; the footer comes after it.
  if (first('night') >= 0 && first('word') >= 0) {
    expect(first('night'), 'the night is reached before the pressable words').toBeLessThan(
      first('word'),
    );
  }
  if (first('word') >= 0 && first('footer') >= 0) {
    expect(first('footer'), 'the footer is reached after the pressable words').toBeGreaterThan(
      first('word'),
    );
  }
  // No trap: focus kept moving, and it is not stuck on one element.
  expect(new Set(stops).size, `focus never moved past ${stops[0]}`).toBeGreaterThan(2);
});

test('every keyboard stop has a visible focus ring @a11y', async ({ page }) => {
  await page.goto('/?s=lamp');
  await expect(page.locator('#section-lamp')).toBeVisible();
  const thin: string[] = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const bad = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      const width = parseFloat(s.outlineWidth || '0');
      const visible = s.outlineStyle !== 'none' && width >= 2;
      // a summary may carry its ring on the box or on its own text decoration
      if (visible) return null;
      const shadow = s.boxShadow && s.boxShadow !== 'none';
      if (shadow) return null;
      return `${el.tagName.toLowerCase()}.${el.className || '(no class)'} outline=${s.outlineStyle} ${s.outlineWidth}`;
    });
    if (bad) thin.push(bad);
  }
  expect(thin, 'every focus stop needs a >= 2 px visible ring (§F.4)').toEqual([]);
});

/* ------------------------------------------------------ target geometry */

interface Box {
  what: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** true for the one fixed element on the site, the ask bar, and its children. */
  fixed: boolean;
}

/**
 * Every `<a>`, `<button>` and `<summary>` that is actually on screen, with the
 * rect a finger would hit. A pressable word carries its 44 px hit box on
 * `summary::after` (§C.2) — the overhang lives in the leading, not in the
 * layout — so the box is grown to the pseudo-element's height before it is
 * measured.
 */
async function boxes(page: Page): Promise<Box[]> {
  return page.evaluate(() => {
    const out: {
      what: string;
      x: number;
      y: number;
      w: number;
      h: number;
      fixed: boolean;
    }[] = [];
    const isFixed = (el: HTMLElement) => {
      for (let n: HTMLElement | null = el; n; n = n.parentElement) {
        if (getComputedStyle(n).position === 'fixed') return true;
      }
      return false;
    };
    for (const el of document.querySelectorAll<HTMLElement>('a[href], button, summary')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || s.display === 'none' || parseFloat(s.opacity) === 0) continue;
      if (el.closest('[hidden]') || el.closest('[aria-hidden="true"]')) continue;
      // the skip link is off-screen until it is focused
      if (r.bottom < 0 || r.right < 0) continue;
      let h = r.height;
      let y = r.top;
      if (el.tagName === 'SUMMARY') {
        const after = getComputedStyle(el, '::after');
        const hit = parseFloat(after.height || '0');
        if (Number.isFinite(hit) && hit > h) {
          y = r.top + r.height / 2 - hit / 2;
          h = hit;
        }
      }
      const label = (el.textContent ?? '').trim().slice(0, 28) || el.tagName.toLowerCase();
      out.push({
        what: `${el.tagName.toLowerCase()}[${el.className || ''}] "${label}"`,
        x: r.left,
        y,
        w: r.width,
        h,
        fixed: isFixed(el),
      });
    }
    return out;
  });
}

for (const width of VIEWPORTS) {
  test(`targets are >= 44 px at ${width} px @a11y`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 400 ? 640 : 900 });
    await page.goto('/?s=lamp');
    await expect(page.locator('#section-lamp')).toBeVisible();
    const small = (await boxes(page)).filter((b) => b.h < 44 - 0.5);
    expect(
      small.map((b) => `${b.what} is ${b.h.toFixed(1)} px tall`),
      `every target is >= 44 px in its tappable dimension at ${width} px (§F.3)`,
    ).toEqual([]);
  });

  test(`targets have >= 8 px of clear space at ${width} px @a11y`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 400 ? 640 : 900 });
    await page.goto('/?s=lamp');
    await expect(page.locator('#section-lamp')).toBeVisible();
    const all = await boxes(page);
    const tight: string[] = [];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i] as Box;
        const b = all[j] as Box;
        // The ask bar is the one fixed element on the site (§F.3) and the
        // prose scrolls underneath it. Its distance from any word in the flow
        // is a function of the scroll offset, not of the design, so the two
        // layers are measured against themselves and not against each other;
        // what keeps the reading clear of the bar is `.blocks`'s
        // padding-bottom, which WP-A's specs measure. Every pair inside one
        // layer — slot to slot, control to control, word to word — is held to
        // the 8 px floor.
        if (a.fixed !== b.fixed) continue;
        const overlapX = a.x < b.x + b.w && b.x < a.x + a.w;
        const overlapY = a.y < b.y + b.h && b.y < a.y + a.h;
        if (overlapX && overlapY) continue; // nested or stacked: not two targets to miss between
        if (overlapY) {
          const gap = a.x < b.x ? b.x - (a.x + a.w) : a.x - (b.x + b.w);
          if (gap < 8 - 0.5) tight.push(`${a.what} / ${b.what} — ${gap.toFixed(1)} px apart`);
        } else if (overlapX) {
          const gap = a.y < b.y ? b.y - (a.y + a.h) : a.y - (b.y + b.h);
          if (gap < 8 - 0.5) tight.push(`${a.what} / ${b.what} — ${gap.toFixed(1)} px apart`);
        }
      }
    }
    expect(tight, `>= 8 px of clear space at ${width} px (§F.3)`).toEqual([]);
  });
}

test('no control is stranded in the hardest one-handed corner @a11y', async ({ page }) => {
  // §F.2, and the rubric point the outgoing site lost: on a phone the reach is
  // the bottom two thirds. Nothing the reader has to press may be pinned into
  // a top corner — and the one fixed element on the site is bottom-anchored.
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/?s=lamp');
  await expect(page.locator('#section-lamp')).toBeVisible();

  const fixed = await page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('a[href], button')) {
      if (getComputedStyle(el).position !== 'fixed') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // a fixed control in the top third, against either edge, is the corner
      const topThird = r.top < innerHeight / 3;
      const cornerX = r.left < innerWidth * 0.25 || r.right > innerWidth * 0.75;
      if (topThird && cornerX) out.push(`${el.className} at ${Math.round(r.top)},${Math.round(r.left)}`);
    }
    return out;
  });
  expect(fixed, 'no fixed control sits in a top corner on a phone (§F.2)').toEqual([]);

  // The three footer controls are in the flow at the foot of the document,
  // which is where a thumb is. Scrolled to the end, they are in the bottom
  // half of the viewport.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(200);
  const footer = await page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('.loop-footer button')) {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight * 0.4) out.push(`${el.textContent} at y=${Math.round(r.top)}`);
    }
    return out;
  });
  expect(footer, 'the footer controls land in the thumb zone (§F.2)').toEqual([]);
});

/* ---------------------------------------------------------------- the rest */

test('the live region exists and carries the changed announcement @a11y', async ({ page }) => {
  await page.goto('/?s=dog');
  const live = page.locator('#loop-live');
  await expect(live).toHaveAttribute('aria-live', 'polite');
  await expect(live).toHaveText('');
  await page.goto(`/?s=lamp#n=${'AAAAAAAAAAAAAAA'}`);
  // a bad code says nothing; a good one is covered by share.spec.ts
  await expect(live).toHaveText('');
});

test('every canvas is hidden from the accessibility tree @a11y', async ({ page }) => {
  for (const slug of ['dog', 'four-seconds']) {
    await page.goto(`/?s=${slug}`);
    await expect(page.locator(`#section-${slug}`)).toBeVisible();
    const bad = await page
      .locator('canvas')
      .evaluateAll((els) => els.filter((e) => e.getAttribute('aria-hidden') !== 'true').length);
    expect(bad, `a canvas on ${slug} is in the accessibility tree`).toBe(0);
  }
});

test('the footer controls are reachable and named by their fixed strings @a11y', async ({
  page,
}) => {
  await page.goto('/');
  for (const [control, label] of [
    ['keep', 'keep this'],
    ['share', 'send the night as you have it'],
  ] as const) {
    const button = page.locator(`[data-control="${control}"]`);
    await expect(button).toHaveCount(1);
    await expect(button).toHaveText(label);
    const box = await button.boundingBox();
    expect(box?.height ?? 0, `${label} needs a 44 px target`).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0, `${label} needs a 44 px target`).toBeGreaterThanOrEqual(44);
  }
});
