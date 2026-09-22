/**
 * tests/copy.spec.ts — the copy law. **OWNED BY WP-A.** Spec: §C.13, §H.2.
 *
 * "No visible string may appear on the site that is not either (a) in
 * `src/content/accounts.ts`, or (b) in the table at §C.13."
 *
 * So this file does not hunt for bad words. It sweeps every rendered text leaf
 * in the document — visible or screen-reader-only, it is all copy — normalises
 * it, and requires it to be a substring of something the writer wrote or of
 * one of the thirteen strings the architect fixed. A word nobody wrote cannot
 * survive that, whichever package put it there. The forbidden-word list is
 * kept as well, because it names the failures that would otherwise arrive
 * inside a lawful string.
 *
 * It also keeps the three quantitative laws: the numerals, the <= 55-word
 * block cap, and "no two pressable words on the same or adjacent rendered
 * line" at 360 px and at 200 % zoom.
 */

import { test, expect, ACCOUNT_SLUGS, seedState, type AccountSlug } from './fixtures';
import { CORPUS, } from '../src/content/accounts';
import { allAsides } from '../src/content/schema';

/* ------------------------------------------------------------ the law */

/** §C.13, verbatim. The only strings on the site the writer did not write. */
const FIXED = [
  'the lights went out for four seconds.',
  'twelve things were awake.',
  'gentle mode',
  'keep this',
  'send the night as you have it',
  'see also',
  'someone read it this way',
  'read',
  'it says more now',
  'changed',
  'loop',
  'skip to the account',
];

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9:/]+/g, ' ')
    .trim();
}

/** Everything the writer wrote, plus the fixed table, plus the three shapes
 *  §C.13 composes out of them: `n/5`, and the night's `<title> — <state>`. */
const LAWFUL: string[] = (() => {
  const out: string[] = [...FIXED];
  for (const account of CORPUS.accounts) {
    out.push(account.title, account.standfirst, account.ask);
    for (const block of account.blocks) out.push(block.text.replace(/[[\]]/g, ''));
    for (const aside of account.asides) out.push(aside.word, aside.text);
    for (const state of ['read', 'it says more now', 'changed']) {
      out.push(`${account.title} — ${state}`);
    }
  }
  for (const c of CORPUS.contradictions) out.push(c.line);
  out.push(CORPUS.choice.prompt);
  for (const o of CORPUS.choice.options) out.push(o.label);
  for (let n = 1; n <= 5; n++) out.push(`${n}/5`);
  return out.map(normalise).filter(Boolean);
})();

/** Never, in any string, anywhere. `click` is not on this list: the dog hears
 *  one, and the corpus is the law. These are the constructions §C.13 forbids
 *  that the corpus never uses, so any sighting is UI copy that escaped. */
const FORBIDDEN = [
  'read more',
  'learn more',
  'click here',
  'discover',
  'experience',
  'journey',
  'immersive',
  'imagine',
  'sign up',
  'sign-up',
  'subscribe',
  'newsletter',
  'right now',
  'get started',
  'find out',
];
const FORBIDDEN_WORDS = ['next', 'tap', 'scroll', 'live', 'countdown', 'people'];

/** Every rendered text leaf, with the unrendered ones dropped. */
async function leaves(page: import('@playwright/test').Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.nodeValue ?? '';
      if (!text.trim()) continue;
      const parent = n.parentElement;
      if (!parent) continue;
      if (parent.closest('script, style, template')) continue;
      // display:none and visibility:hidden are not copy: nothing reaches the
      // screen, and nothing reaches the accessibility tree either.
      if (!parent.getClientRects().length) continue;
      if (getComputedStyle(parent).visibility === 'hidden') continue;
      out.push(text);
    }
    return out;
  });
}

async function sweep(page: import('@playwright/test').Page, where: string): Promise<void> {
  const found = await leaves(page);
  expect(found.length, `${where}: nothing rendered`).toBeGreaterThan(5);
  for (const raw of found) {
    const text = normalise(raw);
    if (!text) continue;
    expect(
      LAWFUL.some((lawful) => lawful.includes(text)),
      `${where}: "${raw.trim()}" is not in the corpus and not in the §C.13 table`,
    ).toBe(true);
  }
  const all = normalise(found.join(' '));
  for (const phrase of FORBIDDEN) {
    expect(all, `${where}: "${phrase}" is forbidden copy`).not.toContain(phrase);
  }
  for (const word of FORBIDDEN_WORDS) {
    expect(all, `${where}: "${word}" is forbidden copy`).not.toMatch(
      new RegExp(`(^| )${word}( |$)`),
    );
  }
  // §C.8: `n/5` is the only numeral the UI may print, and the corpus prints
  // `11:04`, `four`, `six` and `ten` — the last three as words.
  for (const match of all.matchAll(/[0-9][0-9:/]*/g)) {
    expect(['11:04', '1/5', '2/5', '3/5', '4/5', '5/5'], `${where}: numeral ${match[0]}`).toContain(
      match[0],
    );
  }
}

/* --------------------------------------------------------------- sweeps */

test('every word on the site was written by the writer or fixed in §C.13', async ({ page }) => {
  for (const slug of ACCOUNT_SLUGS) {
    await page.goto(`/?s=${slug}`);
    await expect(page.locator(`#section-${slug} h2`)).toBeVisible();
    await sweep(page, `${slug}, empty-handed`);
  }
});

test('and it still is with every key held, in light, under reduced motion', async ({ page }) => {
  await seedState(page, {
    keys: allAsides(CORPUS).map((a) => a.id),
    visited: [...ACCOUNT_SLUGS],
    motion: 'reduce',
  });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  for (const slug of ACCOUNT_SLUGS) {
    await page.goto(`/?s=${slug}`);
    await expect(page.locator(`#section-${slug} h2`)).toBeVisible();
    // every block this account has, held: the locked ones are the ones most
    // likely to carry a string nobody has looked at
    await page.evaluate((s) => {
      document
        .querySelectorAll(`#section-${s} .blk[data-needs]`)
        .forEach((el) => el.setAttribute('data-held', ''));
    }, slug);
    await sweep(page, `${slug}, every key, light, reduced`);
  }
});

/* ------------------------------------------------------- the block cap */

test('no block is longer than fifty-five words', () => {
  for (const account of CORPUS.accounts) {
    for (const block of account.blocks) {
      const words = block.text.replace(/[[\]]/g, '').trim().split(/\s+/).length;
      expect(words, `${account.id}/${block.id} is ${words} words`).toBeLessThanOrEqual(55);
    }
  }
});

/* ----------------------------------------- two pressable words on a line */

for (const width of [360, 180]) {
  test(`no two pressable words share a line or a neighbouring one at ${width} px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const slug of ACCOUNT_SLUGS as readonly AccountSlug[]) {
      await page.goto(`/?s=${slug}`);
      await expect(page.locator(`#section-${slug} h2`)).toBeVisible();
      // every block this account can ever show, and every aside closed: the
      // tightest the page can get
      await page.evaluate((s) => {
        document
          .querySelectorAll(`#section-${s} .blk[data-needs]`)
          .forEach((el) => el.setAttribute('data-held', ''));
        document
          .querySelectorAll(`#section-${s} details[open]`)
          .forEach((el) => el.removeAttribute('open'));
      }, slug);

      const clashes = await page.evaluate((s) => {
        const out: string[] = [];
        for (const blk of document.querySelectorAll(`#section-${s} .blk`)) {
          if (!blk.getClientRects().length) continue;
          const lh = parseFloat(getComputedStyle(blk).lineHeight);
          const words = [...blk.querySelectorAll('summary')];
          for (let i = 0; i < words.length; i++) {
            for (let j = i + 1; j < words.length; j++) {
              // compare the TEXT line boxes, not the hit areas: the law is
              // about where the words are, the hit area follows from it
              for (const a of words[i]!.getClientRects()) {
                for (const b of words[j]!.getClientRects()) {
                  const lines = Math.abs(a.top - b.top) / lh;
                  if (lines < 1.8) {
                    out.push(
                      `${(blk as HTMLElement).dataset.id}: "${words[i]!.textContent}" and ` +
                        `"${words[j]!.textContent}" are ${lines.toFixed(2)} lines apart`,
                    );
                  }
                }
              }
            }
          }
        }
        return out;
      }, slug);
      expect(clashes, `${slug} at ${width} px`).toEqual([]);
    }
  });
}
