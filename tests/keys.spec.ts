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
 *
 * And, from `design/13-bounce-audit-narrative.md` §5, the three that were not
 * wired to the screen:
 *
 * (g) the words the reader has already opened come back SOLID, in the first
 *     painted frame, with nothing running but the inline bootstrap;
 * (h) the word that arrives open is a key the reader holds (§C.4's endowment);
 * (i) no arrival at any URL — `?s=`, the `/s/<slug>` alias or an inbound
 *     share link — marks an account visited that the reader did not open;
 * (j) the first press of the first word, on a cold profile, makes the two
 *     accounts the reader has never opened say they have something, in the
 *     same frame, in the accessibility tree, without moving anything.
 */

import { test, expect, watchLayoutShift, ACCOUNT_SLUGS } from './fixtures';
import type { Page } from '@playwright/test';
import { encodePayload, ASIDE_BYTES } from '../src/lib/share';
import { ASIDE_BIT } from '../src/lib/knowledge';

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

/**
 * Wait until the RUNTIME has entered this account, not merely until the
 * bootstrap has shown it. `#section-<slug>` is visible before first paint —
 * that is the point of `boot.ts` — so a test that presses a word as soon as
 * the section is visible can press it before hydration, get the native
 * `<details>` and no key, and fail for a reason that is not the site's.
 * The server renders every non-landing slot `unread`; only the runtime marks
 * the account the reader is standing in.
 */
async function entered(page: Page, slug: string): Promise<void> {
  await expect(page.locator(`#section-${slug}`)).toBeVisible();
  await expect(
    page.locator(`#section-${slug} .night > a[data-slug="${slug}"]`),
  ).toHaveAttribute('data-state', 'read');
  // …and until the runtime's three delegated listeners are on `document`.
  // They are added at the end of the same synchronous effect that calls
  // `initBeacon`, which is what writes `loop:sid`, so the session id is the
  // one observable that cannot appear before the `toggle` listener exists.
  // Without this a synthetic `element.click()` on a loaded box can open the
  // native `<details>` with nobody listening, and grant no key at all.
  await expect
    .poll(
      () => page.evaluate(() => window.sessionStorage.getItem('loop:sid') !== null),
      { timeout: 15_000 },
    )
    .toBe(true);
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
  await entered(page, 'switch');

  const state = await page.evaluate(async () => {
    const summary = document.querySelector<HTMLElement>(
      '#section-switch details.aside[data-key="one-press"] > summary',
    );
    // `<details>` queues its `toggle` event as a task, so a bare rAF can run
    // BEFORE the runtime has even been told. Wait for the event itself —
    // this listener is registered after the runtime's, so by the time it
    // fires the night is painted — and then for the rAF that follows it,
    // which is still before the frame is put on the screen.
    const painted = new Promise((r) => {
      document.addEventListener('toggle', () => requestAnimationFrame(() => r(null)), {
        capture: true,
        once: true,
      });
    });
    summary?.click();
    await painted;
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
  // corpus titles and §C.13 strings, no invented copy — and the two accounts
  // the reader has never opened are named too, with the word that is true of
  // them: `changed`, never `read` and never `it says more now`.
  expect(state.said).toBe(
    'the dog — it says more now, the road — changed, four seconds — changed',
  );
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
    'the streetlight — it says more now, the river — changed, four seconds — changed, 1/5',
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

/* --------------------------------------------- (g) the solid rule is permanent */

test('the words the reader has opened come back solid, in the first painted frame', async ({
  page,
}) => {
  // §C.2 and §C.8: dotted = unpressed, solid = held, **permanently** — "the
  // page literally gets more solid as the reader works". It used to be
  // written only by the toggle handler, so every word went back to dotted on
  // a reload and the reader's largest progress set reset every session.
  await seed(page, {
    keys: ['two-clicks', 'door-open'],
    visited: ['dog'],
    visits: { dog: 1 },
  });

  // Nothing but the inline bootstrap may be needed for this. Every chunk is
  // held back, so what is measured below is the FIRST painted frame of a
  // document that has run one inline script and no module at all.
  const CHUNKS = '**/_next/static/**/*.js';
  await page.route(CHUNKS, async (route) => {
    await new Promise((r) => setTimeout(r, 3000));
    await route.continue();
  });
  await page.goto('/?s=dog', { waitUntil: 'commit' });

  const held = page.locator('#section-dog details.aside[data-key="two-clicks"]');
  const alsoHeld = page.locator('#section-dog details.aside[data-key="door-open"]');
  const never = page.locator('#section-dog details.aside[data-key="road-goes-one-place"]');
  await expect(held).toHaveCount(1);

  // One evaluation, so the three rules and the attribute are read at the same
  // instant: what the reader has opened is solid, what they have not is
  // dotted, and `data-held` is NOT there yet — the bootstrap did this, the
  // runtime has not run.
  const firstFrame = await page.evaluate(() => {
    const style = (key: string) => {
      const el = document.querySelector(`#section-dog details.aside[data-key="${key}"] > summary`);
      return el ? getComputedStyle(el).textDecorationStyle : 'missing';
    };
    return {
      twoClicks: style('two-clicks'),
      doorOpen: style('door-open'),
      never: style('road-goes-one-place'),
      attribute: document
        .querySelector('#section-dog details.aside[data-key="two-clicks"]')
        ?.getAttribute('data-held') ?? null,
      keys: document.getElementById('loop-keys') !== null,
    };
  });
  expect(firstFrame.twoClicks).toBe('solid');
  expect(firstFrame.doorOpen).toBe('solid');
  // a word they have never opened is still dotted, so the rule still means something
  expect(firstFrame.never).toBe('dotted');
  expect(firstFrame.attribute, 'painted by the bootstrap, before any module ran').toBeNull();
  expect(firstFrame.keys).toBe(true);

  // then the runtime adopts it, and `#loop-keys` goes without anything changing
  await page.unroute(CHUNKS);
  await expect(held).toHaveAttribute('data-held', 'true');
  await expect(alsoHeld).toHaveAttribute('data-held', 'true');
  await expect(page.locator('#loop-keys')).toHaveCount(0);
  await expect(held.locator('summary')).toHaveCSS('text-decoration-style', 'solid');
  await expect(never).not.toHaveAttribute('data-held', 'true');
});

test('a word opened in one session is still solid in the next one', async ({ page }) => {
  await page.goto('/');
  await page.locator('#section-dog details.aside[data-key="wet-wool"] > summary').click();
  await page.waitForTimeout(700);
  await page.reload();
  const word = page.locator('#section-dog details.aside[data-key="wet-wool"]');
  await expect(word).toHaveAttribute('data-held', 'true');
  await expect(word.locator('summary')).toHaveCSS('text-decoration-style', 'solid');
});

/* ------------------------------------------------- (h) the endowed word */

test('the word that arrives open is a key the reader holds', async ({ page }) => {
  // §C.4: the one aside carrying `open: true` is granted at boot, in the
  // account that owns it. Endowed progress is genuine or it is not endowed
  // progress — and an open word rendering solid while being unheld teaches
  // the wrong mapping on the one worked example on the first screen.
  await page.goto('/');
  const open = page.locator('#section-dog details.aside[open]');
  await expect(open).toHaveCount(1);
  await expect(open).toHaveAttribute('data-held', 'true');

  const key = await open.getAttribute('data-key');
  await expect
    .poll(async () => (await stored(page)).keys as string[], { timeout: 8000 })
    .toContain(key);

  // closing it takes the aside away and leaves the key: the word stays solid,
  // which is the mapping §C.2 asks the one worked example to teach
  const word = page.locator(`#section-dog details.aside[data-key="${key}"]`);
  await word.locator('summary').click();
  await expect(word).not.toHaveAttribute('open', '');
  await expect(word.locator('summary')).toHaveCSS('text-decoration-style', 'solid');
  await expect(word).toHaveAttribute('data-held', 'true');
});

test('the endowment is the account that owns the word, not every arrival', async ({ page }) => {
  // A reader who deep-links into the road has not opened anything in the dog,
  // so they are handed nothing from it.
  await page.goto('/?s=road');
  await expect(page.locator('#section-road')).toBeVisible();
  await page.waitForTimeout(800);
  expect((await stored(page)).keys ?? []).toEqual([]);
});

/* ------------------------------ (i) no arrival invents a read account */

/** A real share code for a state, built with the site's own encoder. */
function codeFor(keys: readonly string[]): string {
  const asides = new Uint8Array(ASIDE_BYTES);
  for (const key of keys) {
    const bit = ASIDE_BIT.get(key) as number;
    asides[bit >> 3] = (asides[bit >> 3] as number) | (1 << (bit & 7));
  }
  return encodePayload({
    version: 1,
    belief: 0,
    pass: 0,
    visited: 0,
    contradictions: 0,
    asides,
  });
}

/** The accessible name of one slot, as the accessibility tree has it. */
async function slotName(page: Page, from: string, slug: string): Promise<string> {
  return (
    (await page
      .locator(`#section-${from} .night > a[data-slug="${slug}"] [data-slot-state]`)
      .textContent()) ?? ''
  );
}

for (const [what, url, slug] of [
  ['a deep link', '/?s=road', 'road'],
  ['the prerendered alias', '/s/moth', 'moth'],
] as const) {
  test(`${what} marks only the account it opens`, async ({ page }) => {
    await page.goto(url);
    await expect(page.locator(`#section-${slug}`)).toBeVisible();
    await expect
      .poll(async () => (await stored(page)).visited as string[], { timeout: 8000 })
      .toEqual([slug]);

    // the night says so too: the landing account is a place they have not been
    expect(await slotName(page, slug, 'dog')).toBe('the dog');
    await expect(
      page.locator(`#section-${slug} .night > a[data-slug="dog"]`),
    ).toHaveAttribute('data-state', 'unread');
    // and the account they did open says it was read, because it was
    expect(await slotName(page, slug, slug)).toMatch(/ — read$/);
  });
}

test('an inbound share link marks only the account it opens', async ({ page }) => {
  await page.goto(`/?s=river#n=${codeFor(['two-clicks'])}`);
  await expect(page.locator('#section-river')).toBeVisible();
  await expect
    .poll(async () => (await stored(page)).keys as string[], { timeout: 8000 })
    .toContain('two-clicks');
  expect((await stored(page)).visited).toEqual(['river']);
  expect(await slotName(page, 'river', 'dog')).toBe('the dog');
});

/* ------------------------- (j) the first press, on a cold profile */

/** Every slot of the active account's night: its state, its mark and its box. */
async function night(page: Page, from: string) {
  return page.evaluate((s) => {
    const out: Record<string, { state?: string; more: string | null; name: string; box: string }> = {};
    for (const a of document.querySelectorAll<HTMLElement>(`#section-${s} .night > a`)) {
      const r = a.getBoundingClientRect();
      out[a.dataset.slug ?? '?'] = {
        state: a.dataset.state,
        more: a.dataset.more ?? null,
        name: a.querySelector('[data-slot-state]')?.textContent ?? '',
        box: `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)},${Math.round(r.height)}`,
      };
    }
    return out;
  }, from);
}

test('the first press of the first word reaches two accounts the reader has never opened', async ({
  page,
}) => {
  // §A.2, the ten seconds the whole build is priced on: *press a word, and a
  // slot in the navigation the reader has never visited grows a marker, so
  // the feedback is visibly larger than the target*. `two-clicks` is the
  // dog's second word; `lamp` and `switch` are the two accounts with a block
  // behind it and a cold reader has been to neither.
  const cls = await watchLayoutShift(page);
  await page.goto('/');
  await entered(page, 'dog');

  const before = await night(page, 'dog');
  for (const [slug, slot] of Object.entries(before)) {
    expect(slot.more, `${slug} has nothing waiting before the press`).toBeNull();
  }

  // Read the night from inside the toggle's own frame. The listener is
  // registered after the runtime's, and a rAF callback runs after both and
  // BEFORE the frame is painted, so what it sees is what the reader sees in
  // the same frame as the press. The press itself is a real click, so the
  // `<details>` expanding under the line is user-initiated, as it is for a
  // reader — a synthetic click would count it as an unprompted shift.
  await page.evaluate(() => {
    (window as unknown as { __frame: unknown }).__frame = null;
    document.addEventListener(
      'toggle',
      () => {
        requestAnimationFrame(() => {
          (window as unknown as { __frame: unknown }).__frame = {
            said: document.getElementById('loop-live')?.textContent ?? '',
            more: [...document.querySelectorAll<HTMLElement>('#section-dog .night > a')]
              .filter((a) => a.dataset.more === 'true')
              .map((a) => a.dataset.slug),
          };
        });
      },
      { capture: true, once: true },
    );
  });
  await page.locator('#section-dog details.aside[data-key="two-clicks"] > summary').click();
  const frame = await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (window as unknown as { __frame: { said: string; more: string[] } | null }).__frame,
        ),
      { timeout: 8000 },
    )
    .not.toBeNull()
    .then(() =>
      page.evaluate(
        () => (window as unknown as { __frame: { said: string; more: string[] } }).__frame,
      ),
    );
  const said = frame.said;
  expect(frame.more, 'in the same frame as the press').toEqual(['lamp', 'switch']);
  const after = await night(page, 'dog');

  // it is seen: two slots of twelve, and only those two
  expect(Object.entries(after).filter(([, s]) => s.more === 'true').map(([slug]) => slug)).toEqual([
    'lamp',
    'switch',
  ]);
  // it does not lie: neither of them claims to have been read
  expect(after.lamp?.state).toBe('unread');
  expect(after.switch?.state).toBe('unread');
  // it is heard, in corpus titles and §C.13 strings
  expect(said).toBe('the streetlight — changed, the switch — changed');
  expect(after.lamp?.name).toBe('the streetlight — changed');
  expect(after.switch?.name).toBe('the switch — changed');
  // the account being read never grows a marker (§C.3), and the reader's own
  // slot still says what it said
  expect(after.dog?.more).toBeNull();
  expect(after.dog?.name).toBe('the dog — read');

  // and nothing moved: every slot's box is where it was, and CLS is 0
  for (const slug of Object.keys(before)) {
    expect(after[slug]?.box, `${slug} moved`).toBe(before[slug]?.box);
  }
  await page.waitForTimeout(400);
  expect(await cls()).toBe(0);
});

test('the marker clears by being read, and only by being read', async ({ page }) => {
  const cls = await watchLayoutShift(page);
  await page.goto('/');
  await entered(page, 'dog');
  await page.locator('#section-dog details.aside[data-key="two-clicks"] > summary').click();
  await expect(
    page.locator('#section-dog .night > a[data-slug="switch"]'),
  ).toHaveAttribute('data-more', 'true');

  // going to the lamp does not clear the switch, and the block is simply
  // there when the reader arrives — entry-time materialisation, no shift
  await page.locator('#section-dog .night > a[data-slug="lamp"]').click();
  await expect(page.locator('#section-lamp')).toBeVisible();
  expect(await visibleBlocks(page, 'lamp')).toContain('lamp-clicks');
  await expect(
    page.locator('#section-lamp .night > a[data-slug="lamp"]'),
  ).not.toHaveAttribute('data-more', 'true');
  await expect(
    page.locator('#section-lamp .night > a[data-slug="switch"]'),
  ).toHaveAttribute('data-more', 'true');

  await page.locator('#section-lamp .night > a[data-slug="switch"]').click();
  await expect(page.locator('#section-switch')).toBeVisible();
  await expect(
    page.locator('#section-switch .night > a[data-slug="switch"]'),
  ).not.toHaveAttribute('data-more', 'true');
  await expect(
    page.locator('#section-switch .night > a[data-slug="switch"]'),
  ).toHaveAttribute('data-state', 'read');
  expect(await cls()).toBe(0);
});
