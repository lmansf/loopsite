/**
 * tests/keys.spec.ts — keys, persistence and interleaving without shift.
 * **OWNED BY WP-B.** Spec: §H.2, third entry.
 *
 * (a) opening an aside grants its key, marks the right slots `changed` in the
 *     same frame, and changes nothing inside the account on screen;
 * (b) a reload restores every key, every contradiction, the belief and the pass;
 * (c) closing and reopening an aside grants nothing new;
 * (d) a seeded key materialises its block BETWEEN its neighbours, at its
 *     authored index, not appended;
 * (e) `layout-shift` sums to exactly 0 across load → two asides → two accounts
 *     → back → reload, and a cold load carrying a key records no shift entry
 *     at all — no user input, so nothing is excluded from the measurement;
 * (f) every account renders from an empty key set.
 *
 * Plus the three things §G asks WP-B for by name: a key opened in one account
 * unlocking its block in another on the next entry, the five contradictions
 * counted in the hub, and the belief choice both ways.
 */

import { test, expect, watchLayoutShift, ACCOUNT_SLUGS } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * Seed `loop:v2` for the FIRST load only.
 *
 * `seedState` in the fixture re-runs on every navigation, which is right for
 * the specs that assert on a fixed state and wrong for every test here: half
 * of these reload on purpose, and a seed that reapplies itself would wipe the
 * very keys the reload is supposed to prove came back. So this one writes
 * only when the reader's browser is holding nothing yet.
 */
async function seed(page: Page, state: Record<string, unknown>): Promise<void> {
  await page.addInitScript(
    (s) => {
      try {
        if (!window.localStorage.getItem('loop:v2')) {
          window.localStorage.setItem('loop:v2', JSON.stringify(s));
        }
      } catch {
        /* a test that cannot seed is a test that checks the empty case */
      }
    },
    { v: 2, ...state },
  );
}

/** Every account entered once: what `all-twelve` and the belief choice need. */
const ALL_VISITED = {
  visited: [...ACCOUNT_SLUGS],
  visits: Object.fromEntries(ACCOUNT_SLUGS.map((s) => [s, 1])),
};

/** The ids of the blocks actually on screen in an account, in render order. */
async function visibleBlocks(page: Page, slug: string): Promise<(string | undefined)[]> {
  return page.locator(`#section-${slug} .blk:visible`).evaluateAll((els) =>
    els.map((e) => (e as HTMLElement).dataset.id),
  );
}

/** The stored state, as the reader's browser actually holds it. */
async function stored(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(() => JSON.parse(window.localStorage.getItem('loop:v2') ?? '{}'));
}

/* ------------------------------------------------------------------ (a) */

test('opening an aside changes nothing in the account on screen', async ({ page }) => {
  await page.goto('/');
  const before = await page.locator('#section-dog .blocks').innerHTML();
  await page.locator('#section-dog details.aside:not([open]) > summary').first().click();
  await page.waitForTimeout(100);
  const after = await page.locator('#section-dog .blocks').innerHTML();
  // the only difference is the <details> that was pressed
  expect(after.replace(/ open=""| data-held="true"/g, '')).toBe(
    before.replace(/ open=""| data-held="true"/g, ''),
  );
});

test('the press marks the other account changed before the next paint', async ({ page }) => {
  // the dog has been read; `one press` is the switch's word and the dog has a
  // block behind it, so pressing it in the switch must mark the dog at once.
  await seed(page, { visited: ['dog'], visits: { dog: 1 } });
  await page.goto('/?s=switch');
  await expect(page.locator('#section-switch')).toBeVisible();

  const state = await page.evaluate(async () => {
    const summary = document.querySelector<HTMLElement>(
      '#section-switch details.aside[data-key="one-press"] > summary',
    );
    summary?.click();
    // <details> queues its toggle task; a rAF callback runs after it and
    // BEFORE the frame is painted, so this is "in the same frame".
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const slot = document.querySelector<HTMLElement>(
      '#section-switch .night > a[data-slug="dog"]',
    );
    return {
      night: slot?.dataset.state,
      said: document.getElementById('loop-live')?.textContent ?? '',
      held: document
        .querySelector('#section-switch details.aside[data-key="one-press"]')
        ?.getAttribute('data-held'),
    };
  });
  expect(state.night).toBe('changed');
  expect(state.held).toBe('true');
  // the corpus title, and the §C.13 string — no invented copy
  expect(state.said).toBe('the dog — it says more now');
});

/* ------------------------------------------------------------------ (b) */

test('a key survives a reload', async ({ page }) => {
  await page.goto('/');
  const key = await page
    .locator('#section-dog details.aside:not([open])')
    .first()
    .getAttribute('data-key');
  await page.locator('#section-dog details.aside:not([open]) > summary').first().click();
  await page.waitForTimeout(700);
  await page.reload();
  expect((await stored(page)).keys).toContain(key);
});

test('keys, contradictions, the belief and the pass all come back', async ({ page }) => {
  await seed(page, ALL_VISITED);
  // both halves of `clicks`, one in the dog and one in the switch
  await page.goto('/?s=dog');
  await page.locator('#section-dog details.aside[data-key="two-clicks"] > summary').click();
  await page.locator('#section-dog .night > a[data-slug="switch"]').click();
  await expect(page.locator('#section-switch')).toBeVisible();
  await page.locator('#section-switch details.aside[data-key="one-press"] > summary').click();
  await expect(page.locator('.ask-bar[data-slug="switch"] .hub')).toHaveText('1/5');

  await page.goto('/?s=four-seconds&b=hill');
  await expect(page.locator('#section-four-seconds')).toBeVisible();
  await page.waitForTimeout(700);

  await page.reload();
  const s = await stored(page);
  expect(s.keys).toEqual(expect.arrayContaining(['two-clicks', 'one-press']));
  expect(s.collected).toContain('clicks');
  expect(s.belief).toBe(2);
  expect(s.pass).toBe(1);
  await expect(page.locator('.ask-bar[data-slug="four-seconds"] .hub')).toHaveText('1/5');
  expect(await page.getAttribute('html', 'data-belief')).toBe('hill');
});

/* ------------------------------------------------------------------ (c) */

test('closing and reopening the same word is not a second key', async ({ page }) => {
  await page.goto('/');
  const word = page.locator('#section-dog details.aside[data-key="two-clicks"] > summary');
  await word.click();
  await word.click(); // closed
  await word.click(); // open again
  await page.waitForTimeout(700);
  const s = await stored(page);
  expect((s.keys as string[]).filter((k) => k === 'two-clicks')).toHaveLength(1);
  // the rule under the word stays solid whether the aside is open or shut
  await expect(
    page.locator('#section-dog details.aside[data-key="two-clicks"]'),
  ).toHaveAttribute('data-held', 'true');
});

/* ------------------------------------------------------------------ (d) */

test('a seeded key materialises its block at its authored position', async ({ page }) => {
  await seed(page, { keys: ['one-press'] });
  await page.goto('/?s=dog');
  const ids = await visibleBlocks(page, 'dog');
  expect(ids).toContain('dog-outside');
  // interleaved, not appended
  expect(ids.indexOf('dog-outside')).toBeLessThan(ids.indexOf('dog-2'));
  expect(ids.indexOf('dog-outside')).toBeGreaterThan(ids.indexOf('dog-1'));
  expect(ids[ids.length - 1]).not.toBe('dog-outside');
});

test('a key opened in one account unlocks its block in another, on the next entry', async ({
  page,
}) => {
  const cls = await watchLayoutShift(page);
  await page.goto('/?s=dog');
  expect(await visibleBlocks(page, 'dog')).not.toContain('dog-outside');

  // earn it in the switch
  await page.locator('#section-dog .night > a[data-slug="switch"]').click();
  await expect(page.locator('#section-switch')).toBeVisible();
  const switchBefore = await visibleBlocks(page, 'switch');
  await page.locator('#section-switch details.aside[data-key="one-press"] > summary').click();
  // the account on screen is exactly what it was before the press
  await page.waitForTimeout(150);
  expect(await visibleBlocks(page, 'switch')).toEqual(switchBefore);

  // the dog says more now, from the navigation, without a word about it
  await expect(
    page.locator('#section-switch .night > a[data-slug="dog"]'),
  ).toHaveAttribute('data-state', 'changed');

  // and on the next entry the block is simply there, between its neighbours
  await page.locator('#section-switch .night > a[data-slug="dog"]').click();
  await expect(page.locator('#section-dog')).toBeVisible();
  const ids = await visibleBlocks(page, 'dog');
  expect(ids.indexOf('dog-outside')).toBe(1);
  await expect(page.locator('#section-dog .blk[data-id="dog-outside"]')).toHaveAttribute(
    'data-new',
    'true',
  );
  // having been re-read, the dog stops saying it says more
  await expect(
    page.locator('#section-dog .night > a[data-slug="dog"]'),
  ).toHaveAttribute('data-state', 'read');
  expect(await cls()).toBe(0);
});

/* ------------------------------------------------------------------ (e) */

test('a whole navigation shifts nothing', async ({ page }) => {
  const cls = await watchLayoutShift(page);
  await page.goto('/');
  // every account carries its own night, and only the active one is shown —
  // so a slot is always addressed through the section it lives in.
  await page.locator('#section-dog details.aside:not([open]) > summary').first().click();
  await page.locator('#section-dog .night > a[data-slug="lamp"]').click();
  await expect(page.locator('#section-lamp')).toBeVisible();
  await page.locator('#section-lamp details.aside:not([open]) > summary').first().click();
  await page.locator('#section-lamp .night > a[data-slug="river"]').click();
  await expect(page.locator('#section-river')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#section-lamp')).toBeVisible();
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.locator('#section-lamp')).toBeVisible();
  await page.waitForTimeout(300);
  expect(await cls()).toBe(0);
});

test('a cold load carrying a key records no layout shift at all', async ({ page }) => {
  // The hardest version of the same claim: nothing here is excluded as
  // user-initiated, because the reader has not touched anything. The block
  // exists before the first paint because `#loop-keys` put it there.
  await seed(page, { keys: ['one-press'], visited: ['dog'], visits: { dog: 1 } });
  const cls = await watchLayoutShift(page);
  await page.goto('/?s=dog', { waitUntil: 'load' });
  await expect(page.locator('#section-dog .blk[data-id="dog-outside"]')).toBeVisible();
  await page.waitForTimeout(1200);
  const entries = await page.evaluate(
    () => performance.getEntriesByType('layout-shift').length,
  );
  expect(entries).toBe(0);
  expect(await cls()).toBe(0);
});

/* ------------------------------------------------------------------ (f) */

test('every account renders from an empty key set, and nothing else does', async ({ page }) => {
  await page.goto('/');
  for (const slug of ACCOUNT_SLUGS) {
    await page.locator(`#section-dog .night > a[data-slug="${slug}"]`).first().click();
    await expect(page.locator(`#section-${slug}`)).toBeVisible();
    const ids = await visibleBlocks(page, slug);
    if (slug === 'four-seconds') {
      // seven blank rules, each a real sentence made transparent, each with
      // its `see also` — the account is never locked and never empty (§C.10)
      expect(await page.locator('#section-four-seconds .blocks .blk').count()).toBe(7);
      expect(await page.locator('#section-four-seconds .see-also:visible').count()).toBe(7);
      expect(
        await page.locator('#section-four-seconds .blocks .blk[data-held]').count(),
      ).toBe(0);
    } else {
      expect(ids.length).toBeGreaterThan(3);
      // nothing behind a key the reader does not hold is on screen
      expect(await page.locator(`#section-${slug} .blk[data-needs]:visible`).count()).toBe(0);
    }
    await page.goto('/');
  }
});

/* ------------------------------------------- the five, counted in the hub */

test('the hub counts the contradictions and never says who is wrong', async ({ page }) => {
  await seed(page, { keys: ['bridge-dark'], visited: ['lamp'], visits: { lamp: 1 } });
  await page.goto('/?s=bus');
  await expect(page.locator('.ask-bar[data-slug="bus"] .hub')).toHaveText('');
  await page.locator('#section-bus details.aside[data-key="light-on-the-bridge"] > summary').click();
  await expect(page.locator('.ask-bar[data-slug="bus"] .hub')).toHaveText('1/5');
  await expect(page.locator('#loop-live')).toHaveText(
    'the streetlight — it says more now, 1/5',
  );
});

test('a reader who has read everything can reach all five, and no more', async ({ page }) => {
  // The five pairs, one of which needs both beliefs to have been held — the
  // lamp says `from below` in the valley and `from above` on the hill.
  await seed(page, {
    ...ALL_VISITED,
    keys: [
      'two-clicks',
      'one-press',
      'bridge-dark',
      'light-on-the-bridge',
      'six-wingbeats',
      'clock-counts-four',
      'hill-empty',
      'footsteps-up',
      'lit-from-below',
    ],
    belief: 2,
  });
  await page.goto('/?s=lamp');
  await expect(page.locator('.ask-bar[data-slug="lamp"] .hub')).toHaveText('4/5');
  // the hill half of the lamp is on screen only under the hill belief
  await page.locator('#section-lamp details.aside[data-key="lit-from-above"] > summary').click();
  await expect(page.locator('.ask-bar[data-slug="lamp"] .hub')).toHaveText('5/5');
  await page.waitForTimeout(700);
  expect((await stored(page)).collected).toHaveLength(5);
});

/* ------------------------------------------------------ the belief choice */

test('the belief choice is offered once the twelve have been read, and goes both ways', async ({
  page,
}) => {
  await seed(page, ALL_VISITED);
  await page.goto('/?s=four-seconds');
  const choice = page.locator('#section-four-seconds .blk.choice');
  await expect(choice).toBeVisible();
  const valley = choice.locator('[data-belief-option="valley"]');
  const hill = choice.locator('[data-belief-option="hill"]');

  await valley.click();
  await expect(page.locator('html')).toHaveAttribute('data-belief', 'valley');
  await expect(valley).toHaveAttribute('aria-current', 'true');
  // said twice, never by colour: the pip fills as well
  await expect(valley.locator('.pip > circle')).toHaveAttribute('fill', 'currentColor');
  await expect(hill.locator('.pip > circle')).toHaveAttribute('fill', 'none');
  expect(page.url()).toContain('b=valley');

  // the other option is still on screen and still enabled: one tap reverses it
  await expect(hill).toBeVisible();
  await hill.click();
  await expect(page.locator('html')).toHaveAttribute('data-belief', 'hill');
  await expect(hill).toHaveAttribute('aria-current', 'true');
  await expect(valley).not.toHaveAttribute('aria-current', 'true');

  // and so does Back
  await page.goBack();
  await expect(page.locator('html')).toHaveAttribute('data-belief', 'valley');

  await page.waitForTimeout(700);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-belief', 'valley');
  expect((await stored(page)).belief).toBe(1);
});

test('the belief changes four accounts, at their next entry', async ({ page }) => {
  await seed(page, { ...ALL_VISITED, belief: 1 });
  await page.goto('/?s=road');
  let ids = await visibleBlocks(page, 'road');
  expect(ids).toContain('road-valley');
  expect(ids).not.toContain('road-hill');

  await page.goto('/?s=four-seconds');
  await page.locator('[data-belief-option="hill"]').click();
  await page.locator('#section-four-seconds .night > a[data-slug="road"]').click();
  await expect(page.locator('#section-road')).toBeVisible();
  ids = await visibleBlocks(page, 'road');
  expect(ids).toContain('road-hill');
  expect(ids).not.toContain('road-valley');
});

test('both answers are real links that work without JavaScript', async ({ browser }) => {
  // the memory needs JavaScript; the links do not, and they are the same links
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/?s=four-seconds&b=hill');
  const options = page.locator('#section-four-seconds .blk.choice a[data-belief-option]');
  await expect(options).toHaveCount(2);
  for (const href of await options.evaluateAll((els) =>
    els.map((e) => e.getAttribute('href')),
  )) {
    expect(href).toMatch(/^\/\?s=four-seconds&b=(valley|hill)$/);
    const response = await page.goto(href as string);
    expect(response?.status()).toBe(200);
    await expect(page.locator('#section-four-seconds')).toBeVisible();
  }
  await context.close();
});

/* ------------------------------------------------- the blanks of §C.10 */

test('a blank rule is silent, its see also is not, and earning it gives the sentence back', async ({
  page,
}) => {
  await seed(page, { ...ALL_VISITED });
  await page.goto('/?s=four-seconds');
  const blank = page.locator('#section-four-seconds .blk[data-id="fs-press"]');
  await expect(blank).toBeVisible();

  const shape = await blank.evaluate((el) => {
    const veil = el.querySelector('[data-veil]');
    const link = el.querySelector('.see-also a');
    return {
      veiled: veil?.getAttribute('aria-hidden'),
      // the veil carries no style of its own, so it moves nothing
      veilClass: veil?.getAttribute('class'),
      veilStyle: veil?.getAttribute('style'),
      // the link is NOT inside it: it is heard, and it is reachable
      linkInsideVeil: veil?.contains(link) ?? true,
      linkTabIndex: (link as HTMLElement | null)?.tabIndex,
      wordsTabbable: [...el.querySelectorAll('summary')].some((s) => (s as HTMLElement).tabIndex >= 0),
      blockHidden: el.getAttribute('aria-hidden'),
    };
  });
  expect(shape.veiled).toBe('true');
  expect(shape.veilClass).toBeNull();
  expect(shape.veilStyle).toBeNull();
  expect(shape.linkInsideVeil).toBe(false);
  expect(shape.linkTabIndex).toBe(0);
  expect(shape.wordsTabbable).toBe(false);
  expect(shape.blockHidden).toBeNull();

  // earn it, come back, and the sentence is a sentence again
  await page.locator('#section-four-seconds .night > a[data-slug="switch"]').click();
  await expect(page.locator('#section-switch')).toBeVisible();
  await page.locator('#section-switch details.aside[data-key="one-press"] > summary').click();
  await page.locator('#section-switch .night > a[data-slug="four-seconds"]').click();
  await expect(blank).toHaveAttribute('data-held', 'true');
  expect(await blank.evaluate((el) => el.querySelector('[data-veil]') !== null)).toBe(false);
  expect(await blank.evaluate((el) => el.getAttribute('aria-hidden'))).toBeNull();
});
