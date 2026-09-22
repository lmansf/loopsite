/**
 * tests/reading.spec.ts — zero-JS reading and the pressable word.
 * **OWNED BY WP-A.** Spec: §C.1, §C.2, §C.10, §F.2, §H.2 (first entry).
 *
 * The prose is the product, so this file is the product's test. It proves
 * four things and nothing else:
 *
 *   1. the raw response body is the whole site, and it reads with JavaScript
 *      switched off;
 *   2. a bracketed word is a real `<details>` that opens in the first painted
 *      frame, at the foot of its paragraph, WITHOUT CUTTING A SENTENCE — in
 *      all twelve accounts, at 360 px and at 320 px;
 *   3. the pressable word is a 44 px target that does not touch the leading,
 *      and the reader's first screen holds one they have not pressed;
 *   4. `four seconds` at zero keys is seven blanks in the exact shape of the
 *      sentences it is withholding — and does not read them out;
 *   5. the five contradiction lines are in the document, reach the reader who
 *      earns them, and cost no layout shift doing it.
 */

import { test, expect, ACCOUNT_SLUGS, seedState, watchLayoutShift } from './fixtures';
import { CORPUS } from '../src/content/accounts';
import { allAsides } from '../src/content/schema';

/** The account a contradiction's line lives in: the one it names first. */
function home(needs: readonly string[]): string {
  const account = CORPUS.accounts.find((a) => a.asides.some((x) => x.id === needs[0]));
  if (!account) throw new Error(`no account emits ${needs[0]}`);
  return account.id;
}

const FOUR_SECONDS = CORPUS.accounts.find((a) => a.id === 'four-seconds');
const LOCKED_FS_BLOCKS = (FOUR_SECONDS?.blocks ?? []).filter((b) => b.needs);

/* ------------------------------------------------------------------ §C.1 */

test('the raw response body is the whole site', async ({ request }) => {
  const res = await request.get('/');
  expect(res.status()).toBe(200);
  const html = await res.text();

  for (const account of CORPUS.accounts) {
    expect(html, `section-${account.id} is not in the initial HTML`).toContain(
      `id="section-${account.id}"`,
    );
    for (const block of account.blocks) {
      expect(html, `${account.id}/${block.id} is not in the initial HTML`).toContain(
        `data-id="${block.id}"`,
      );
    }
    // every aside body, held or not, is in the document the reader is served
    for (const aside of account.asides) {
      expect(html, `${account.id}/${aside.id} has no pressable word`).toContain(
        `data-key="${aside.id}"`,
      );
      const opening = aside.text.split('.')[0]?.slice(0, 40) ?? '';
      expect(html, `${account.id}/${aside.id}'s body is not in the initial HTML`).toContain(
        opening,
      );
    }
  }

  // exactly one aside in the whole corpus arrives already open (§C.4)
  expect([...html.matchAll(/<details class="aside"[^>]* open>/g)]).toHaveLength(1);

  // and all five contradiction lines are server-rendered, one per account,
  // behind the `contra:<id>` key the engine already computes (§C.5)
  for (const c of CORPUS.contradictions) {
    expect(html, `contradiction ${c.id} is not in the document`).toContain(c.line);
    expect(html).toContain(`data-needs="contra:${c.id}"`);
  }
  expect(html).toContain('the lights went out for four seconds.');
  expect(html).toContain('twelve things were awake.');
  // a block is a div, never a <p>: <details> is not legal inside one (§I.6)
  expect(html).not.toMatch(/<p[^>]*class="blk"/);
  expect([...html.matchAll(/class="blk"/g)].length).toBeGreaterThanOrEqual(
    CORPUS.accounts.reduce((n, a) => n + a.blocks.length, 0),
  );
});

test('with JavaScript disabled the document is readable and every link works', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');

  await expect(page.locator('h1')).toHaveCount(1);
  for (const slug of ACCOUNT_SLUGS) {
    await expect(page.locator(`#section-${slug}`)).toBeVisible();
    await expect(page.locator(`#section-${slug}[aria-labelledby="h-${slug}"]`)).toHaveCount(1);
  }

  // every night slot and every ask card is a real anchor to a real route
  const hrefs = await page.locator('#section-dog .night a, #section-dog .ask.card').evaluateAll(
    (els) => els.map((el) => el.getAttribute('href')),
  );
  expect(hrefs.length).toBeGreaterThanOrEqual(ACCOUNT_SLUGS.length);
  for (const href of hrefs) expect(href).toMatch(/^\/\?s=[a-z-]+$/);

  // the already-open aside's note is on screen with no JavaScript at all —
  // the sibling pairing is CSS the oldest browser in service understands
  await expect(
    page.locator('#section-dog .blk[data-id="dog-1"] .aside-body[data-i="0"]'),
  ).toBeVisible();
  // and every contradiction line is plain prose to a reader with no
  // JavaScript: nothing is locked, so nothing is withheld
  for (const c of CORPUS.contradictions) {
    await expect(page.locator(`.blk[data-id="contra-${c.id}"]`)).toBeVisible();
  }

  // and `four seconds` is continuous prose, not blanks: without JavaScript
  // there are no locked blocks, so there is nothing to point away from.
  const fourSeconds = page.locator('#section-four-seconds');
  for (const block of LOCKED_FS_BLOCKS) {
    await expect(fourSeconds.locator(`[data-id="${block.id}"]`)).toBeVisible();
  }
  await expect(fourSeconds.locator('.see-also')).toHaveCount(LOCKED_FS_BLOCKS.length);
  await expect(fourSeconds.locator('.see-also').first()).toBeHidden();

  await context.close();
});

/* ------------------------------------------------------------------ §C.2 */

test('a summary press opens its aside before React has hydrated', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForTimeout(200);

  const aside = page.locator('#section-dog details.aside[data-key="two-clicks"]');
  await aside.locator('> summary').click();

  await expect(page.locator('#section-dog details.aside[open]')).toHaveCount(2);
  await expect(aside).toHaveAttribute('open', '');
  await expect(
    page.locator('#section-dog .blk[data-id="dog-1"] .aside-body[data-i="1"]'),
  ).toBeVisible();
});

test('a closed aside is closed to a screen reader too', async ({ page }) => {
  await page.goto('/?s=dog');
  const block = page.locator('#section-dog .blk[data-id="dog-1"]');
  await expect(block).toBeVisible();

  // The aside is a disclosure `group` named by its word. Closed, the body is
  // not in the accessibility tree at all — which is the point: a reader who
  // has not pressed the word has not been told what it says, by eye or by ear.
  const closed = await block.ariaSnapshot();
  expect(closed).toContain('- paragraph:');
  expect(closed).toContain('group: the second click');
  expect(closed).not.toContain('a click is a switch');

  await block.locator('details.aside[data-key="two-clicks"] > summary').click();
  const open = await block.ariaSnapshot();
  expect(open).toContain('a click is a switch');
});

for (const width of [360, 1280]) {
  test(`the aside opens at the foot of its paragraph at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?s=dog');
    await expect(page.locator('#section-dog h2')).toBeVisible();

    const handle = page.locator('#section-dog details.aside[data-key="two-clicks"]');
    const summary = handle.locator('> summary');
    const block = page.locator('#section-dog .blk[data-id="dog-1"]');
    const body = block.locator('.aside-body[data-i="1"]');

    const before = await block.boundingBox();
    await summary.click();
    await expect(handle).toHaveAttribute('open', '');
    await expect(body).toBeVisible();
    const after = await block.boundingBox();

    // the column does not move: the aside opens inside the paragraph's box,
    // it does not reflow the measure (§C.2, §C.3).
    expect(after?.x).toBeCloseTo(before?.x ?? -1, 1);
    expect(after?.width).toBeCloseTo(before?.width ?? -1, 1);
    // and it opens DOWNWARDS: the paragraph starts where it started
    expect(after?.y).toBeCloseTo(before?.y ?? -1, 1);

    // the body is below every line of the paragraph's prose, and spans the
    // column: it is a note under the paragraph, not a box inside a sentence
    const geometry = await block.evaluate((blk) => {
      const body = blk.querySelector('.aside-body[data-i="1"]') as HTMLElement;
      const prose = document.createRange();
      prose.setStart(blk, 0);
      prose.setEndBefore(blk.querySelector('.aside-body') as HTMLElement);
      const lines = [...prose.getClientRects()].filter((r) => r.height > 0);
      const b = body.getBoundingClientRect();
      return {
        proseBottom: Math.max(...lines.map((r) => r.bottom)),
        bodyTop: b.top,
        bodyWidth: b.width,
        blkWidth: blk.getBoundingClientRect().width,
      };
    });
    expect(geometry.bodyTop).toBeGreaterThanOrEqual(geometry.proseBottom - 1);
    expect(geometry.bodyWidth).toBeGreaterThan(geometry.blkWidth * 0.8);
  });
}

/**
 * The one that matters, and it is checked on every aside in the corpus rather
 * than on `dog`: opening a word may not break the sentence it is in.
 *
 * A block's prose is everything before its first note. If opening an aside
 * leaves that prose one contiguous run of line boxes — same count as when it
 * was shut, every one of them above the note — then no sentence was cut,
 * whatever the wrapping does at this width.
 */
for (const width of [360, 320]) {
  test(`an opened aside never splits a sentence, in any account, at ${width} px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const slug of ACCOUNT_SLUGS) {
      await page.goto(`/?s=${slug}`);
      await expect(page.locator(`#section-${slug} h2`)).toBeVisible();
      // every block this account can ever show, so the locked prose is measured too
      await page.evaluate((s) => {
        document
          .querySelectorAll(`#section-${s} .blk[data-needs]`)
          .forEach((el) => el.setAttribute('data-held', 'true'));
      }, slug);

      const faults = await page.evaluate((s) => {
        const out: string[] = [];
        const lineBoxes = (blk: Element) => {
          const first = blk.querySelector('.aside-body');
          const range = document.createRange();
          range.setStart(blk, 0);
          if (first) range.setEndBefore(first);
          else range.setEnd(blk, blk.childNodes.length);
          const tops = new Set<number>();
          for (const r of range.getClientRects()) if (r.height > 0) tops.add(Math.round(r.top));
          return tops;
        };
        for (const blk of document.querySelectorAll(`#section-${s} .blk`)) {
          const asides = [...blk.querySelectorAll<HTMLDetailsElement>('details.aside')];
          if (asides.length === 0 || !blk.getClientRects().length) continue;
          const id = (blk as HTMLElement).dataset.id;
          for (const a of asides) a.open = false;
          const shut = lineBoxes(blk);
          for (const a of asides) {
            a.open = true;
            const open = lineBoxes(blk);
            const body = blk.querySelector<HTMLElement>(
              `.aside-body[data-i="${a.dataset.i}"]`,
            );
            if (!body || getComputedStyle(body).display === 'none') {
              out.push(`${id}: opening ${a.dataset.key} showed no note`);
              a.open = false;
              continue;
            }
            if (open.size !== shut.size) {
              out.push(
                `${id}: opening ${a.dataset.key} reflowed the prose from ` +
                  `${shut.size} lines to ${open.size}`,
              );
            }
            const top = body.getBoundingClientRect().top;
            for (const line of open) {
              if (line >= top - 1) {
                out.push(`${id}: ${a.dataset.key}'s note sits above a line of the paragraph`);
                break;
              }
            }
            a.open = false;
          }
        }
        return out;
      }, slug);
      expect(faults, `${slug} at ${width} px`).toEqual([]);
    }
  });
}

/** The note says which word it answers — the tie, and the corpus's own word. */
test('every note names its word', async ({ page }) => {
  for (const account of CORPUS.accounts) {
    await page.goto(`/?s=${account.id}`);
    await expect(page.locator(`#section-${account.id} h2`)).toBeVisible();
    const notes = await page.evaluate(
      (s) =>
        [...document.querySelectorAll<HTMLElement>(`#section-${s} details.aside`)].map((d) => {
          const blk = d.closest('.blk');
          const body = blk?.querySelector<HTMLElement>(`.aside-body[data-i="${d.dataset.i}"]`);
          return {
            key: d.dataset.key ?? '',
            word: body?.querySelector('.aside-word')?.textContent ?? null,
            text: (body?.textContent ?? '').slice(0, 200),
          };
        }),
      account.id,
    );
    expect(notes.map((n) => n.key).sort()).toEqual(account.asides.map((a) => a.id).sort());
    for (const note of notes) {
      const aside = account.asides.find((a) => a.id === note.key);
      expect(note.word, `${account.id}/${note.key} has no named note`).toBe(aside?.word);
      expect(note.text).toContain((aside?.text ?? '').slice(0, 40));
    }
  }
});

test('a closed aside reads as an ordinary word on its own line', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto('/?s=lamp');
  await expect(page.locator('#section-lamp h2')).toBeVisible();

  // Every block with no open aside is an exact whole number of line boxes.
  // A closed <details> that fragmented its inline, or a hit area that grew the
  // leading, would break that immediately.
  const rhythm = await page.locator('#section-lamp .blk').evaluateAll((els) =>
    els
      .filter((el) => el.getClientRects().length > 0 && !el.querySelector('details[open]'))
      .map((el) => {
        const lh = parseFloat(getComputedStyle(el).lineHeight);
        const h = el.getBoundingClientRect().height;
        return { id: (el as HTMLElement).dataset.id, lines: h / lh };
      }),
  );
  expect(rhythm.length).toBeGreaterThan(2);
  for (const { id, lines } of rhythm) {
    expect(Math.abs(lines - Math.round(lines)), `${id} is ${lines} line boxes tall`).toBeLessThan(
      0.02,
    );
  }
});

/* ------------------------------------------------------------------ §F.2 */

test('the pressable word carries a 44 px target and all six states', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto('/?s=dog');
  const summary = page.locator('#section-dog details.aside[data-key="two-clicks"] > summary');
  await expect(summary).toBeVisible();

  // rest: a dotted rule, the prose colour, never colour alone
  const rest = await summary.evaluate((el) => {
    const s = getComputedStyle(el);
    const prose = getComputedStyle(el.closest('.blocks') as HTMLElement);
    return {
      style: s.textDecorationStyle,
      line: s.textDecorationLine,
      colour: s.color,
      prose: prose.color,
      cursor: s.cursor,
      height: el.getBoundingClientRect().height,
    };
  });
  expect(rest.style).toBe('dotted');
  expect(rest.line).toContain('underline');
  expect(rest.colour).toBe(rest.prose);
  expect(rest.cursor).toBe('pointer');
  expect(rest.height).toBeGreaterThanOrEqual(44);

  // open / held: the rule goes solid, permanently
  await summary.click();
  await expect(summary).toHaveCSS('text-decoration-style', 'solid');

  // focus-visible: a real 2 px ring, reached by the keyboard
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  let ring: { width: string; style: string; offset: string } | null = null;
  for (let i = 0; i < 40 && !ring; i++) {
    await page.keyboard.press('Tab');
    ring = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el.tagName !== 'SUMMARY' || !el.matches(':focus-visible')) return null;
      const s = getComputedStyle(el);
      return { width: s.outlineWidth, style: s.outlineStyle, offset: s.outlineOffset };
    });
  }
  expect(ring, 'no <summary> is reachable by Tab with a visible focus ring').not.toBeNull();
  expect(parseFloat(ring?.width ?? '0')).toBeGreaterThanOrEqual(2);
  expect(ring?.style).toBe('solid');
});

/* ----------------------------------------------------------------- §C.10 */

test('four seconds at zero keys is seven blanks and seven ways back', async ({ page }) => {
  await page.goto('/?s=four-seconds');
  const section = page.locator('#section-four-seconds');
  await expect(section.locator('h2')).toBeVisible();

  // every block in this account is locked, so an empty-handed reader gets the
  // heading, the standfirst, the shape of seven sentences, and the index
  expect(LOCKED_FS_BLOCKS.length).toBe(7);
  const blanks = section.locator('.blk[data-needs]:not([data-held]):not(.choice)');
  await expect(blanks).toHaveCount(7);
  const seeAlso = blanks.locator('.see-also');
  await expect(seeAlso).toHaveCount(7);
  await expect(seeAlso.first()).toBeVisible();

  // each one is `see also` and a real link, named for the account that holds
  // the key — never a bare `see also` repeated seven times
  const links = await seeAlso.locator('a').evaluateAll((els) =>
    els.map((el) => ({ href: el.getAttribute('href'), text: (el.textContent ?? '').trim() })),
  );
  expect(links).toHaveLength(7);
  const titles = CORPUS.accounts.map((a) => a.title);
  for (const link of links) {
    expect(link.href).toMatch(/^\/\?s=[a-z-]+$/);
    expect(titles, `"${link.text}" is not an account title`).toContain(link.text);
  }
  // six of the twelve accounts are named, so the ending is an index
  expect(new Set(links.map((l) => l.href)).size).toBeGreaterThanOrEqual(6);

  // and the ask card is still there at full salience
  await expect(section.locator('.ask.card')).toHaveCount(1);

  // NONE of the withheld prose is readable, by eye or by screen reader
  const read = (await section.innerText()).toLowerCase();
  for (const block of LOCKED_FS_BLOCKS) {
    const sentence = block.text.replace(/[[\]]/g, '').slice(0, 40).toLowerCase();
    expect(read, `${block.id} was read out to an empty-handed reader`).not.toContain(sentence);
  }
});

test('a blank rule is the exact shape of the sentence it hides', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto('/?s=four-seconds');
  await expect(page.locator('#section-four-seconds h2')).toBeVisible();

  const shapes = await page
    .locator('#section-four-seconds .blk[data-needs]:not(.choice)')
    .evaluateAll((els) =>
      els.map((el) => {
        // The width of every LINE the sentence makes — which is what "the
        // shape of the sentence" means. Rects are merged by line first: a
        // nested inline (a pressable word) splits a line into two runs, and
        // where it splits is not part of the shape.
        const boxes = (node: Element) => {
          const lines = new Map<number, { l: number; r: number }>();
          for (const rect of node.getClientRects()) {
            const key = Math.round(rect.top);
            const line = lines.get(key);
            if (line) {
              line.l = Math.min(line.l, rect.left);
              line.r = Math.max(line.r, rect.right);
            } else {
              lines.set(key, { l: rect.left, r: rect.right });
            }
          }
          return [...lines.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([, v]) => Math.round(v.r - v.l));
        };
        const rule = el.querySelector('.rule') as HTMLElement;
        const blank = boxes(rule);
        const ruled = getComputedStyle(rule).borderBottomStyle;

        // The blank claims to be the shape of the sentence. Prove it: put the
        // same sentence into the same column as ordinary prose and compare
        // every line box. Width, wrapping and line count have to match, or the
        // reader is being shown the shape of something else.
        const twin = el.cloneNode(true) as HTMLElement;
        twin.removeAttribute('data-needs');
        twin.querySelector('.see-also')?.remove();
        el.after(twin);
        const prose = boxes(twin.querySelector('.rule') as HTMLElement);
        twin.remove();

        return { id: (el as HTMLElement).dataset.id, blank, prose, ruled };
      }),
    );

  expect(shapes).toHaveLength(7);
  for (const shape of shapes) {
    expect(shape.blank.length, `${shape.id} has no line boxes`).toBeGreaterThan(1);
    expect(shape.blank, `${shape.id} is not the shape of its sentence`).toEqual(shape.prose);
    expect(shape.ruled, `${shape.id} draws no rule`).toBe('solid');
    // the last line of a blank is shorter than the measure — it is a sentence,
    // not a slab
    expect(Math.min(...shape.blank)).toBeLessThan(Math.max(...shape.blank));
  }
});

test('every account is readable from an empty key set', async ({ page }) => {
  for (const slug of ACCOUNT_SLUGS) {
    await page.goto(`/?s=${slug}`);
    await expect(page.locator(`#section-${slug} h2`)).toBeVisible();
    await expect(page.locator(`#section-${slug} .blk:visible`).first()).toBeVisible();
  }
});


/* ------------------------------------------------- §F.2, §F.3: the first press */

test('the first screen holds a word the reader has not pressed', async ({ page }) => {
  // 360 x 640 is the device §F.3 and the rubric both measure. A reader's
  // first instinct must be able to ADD something: if the only pressable word
  // on the screen is the one that is already open, the teaching gesture takes
  // the five lines of bonus text away and grants nothing (`13` §2.2).
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/');
  await expect(page.locator('#section-dog .blk[data-id="dog-1"]')).toBeVisible();

  const screen = await page.evaluate(() => {
    const visible = (el: Element) => el.getClientRects().length > 0;
    const bar = [...document.querySelectorAll('.ask-bar')].filter(visible)[0] as HTMLElement;
    const ceiling = bar ? bar.getBoundingClientRect().top : window.innerHeight;
    const shut: string[] = [];
    for (const summary of document.querySelectorAll<HTMLElement>(
      '#section-dog details.aside:not([open]) > summary',
    )) {
      const r = summary.getBoundingClientRect();
      const dotted = getComputedStyle(summary).textDecorationStyle === 'dotted';
      if (dotted && r.top >= 0 && r.bottom <= ceiling) {
        shut.push(summary.parentElement?.dataset.key ?? '');
      }
    }
    return { ceiling, shut, scrolled: window.scrollY };
  });

  expect(screen.scrolled).toBe(0);
  expect(
    screen.shut,
    'no unpressed word is fully above the ask bar in the first viewport',
  ).not.toEqual([]);

  // and pressing it ADDS: a key the reader did not hold a moment ago, and the
  // solid rule that says so for the rest of their life with the site
  const keys = () =>
    page.evaluate(
      () => (JSON.parse(window.localStorage.getItem('loop:v2') ?? '{}').keys ?? []) as string[],
    );
  const word = screen.shut[0] as string;
  expect(await keys()).not.toContain(word);
  await page.locator(`#section-dog details.aside[data-key="${word}"] > summary`).click();
  await expect(page.locator(`#section-dog details.aside[data-key="${word}"]`)).toHaveAttribute(
    'data-held',
    'true',
  );
  await expect(async () => expect(await keys()).toContain(word)).toPass();
});

/* --------------------------------------------- §C.5: the five contradictions */

test('a contradiction pays out its line in the account it names first', async ({ page }) => {
  const shift = await watchLayoutShift(page);
  const clicks = CORPUS.contradictions.find((c) => c.id === 'clicks');
  if (!clicks) throw new Error('the clicks contradiction is gone');

  // the only way a contradiction can be earned: two words in two accounts
  await page.goto('/?s=dog');
  await page.locator('#section-dog details.aside[data-key="two-clicks"] > summary').click();
  await page.locator('#section-dog .night a[data-slug="switch"]').click();
  await expect(page.locator('#section-switch h2')).toBeVisible();
  await page.locator('#section-switch details.aside[data-key="one-press"] > summary').click();

  // the hub says one of five — and nothing has appeared in the account the
  // reader is looking at, which is the rule that protects CLS (§C.3)
  await expect(page.locator('.ask-bar[data-slug="switch"] .hub')).toHaveText('1/5');
  expect(await page.locator('.blk.contra').evaluateAll(
    (els) => els.filter((el) => el.getClientRects().length > 0).length,
  )).toBe(0);

  // it is waiting in `the dog` — the witness the line names first, and the
  // one the reader read before this one
  await page.locator('#section-switch .night a[data-slug="dog"]').click();
  const line = page.locator('#section-dog .blk[data-id="contra-clicks"]');
  await expect(line).toBeVisible();
  await expect(line).toHaveText(clicks.line);
  await expect(line).toHaveAttribute('data-new', 'true');
  await expect(line).toHaveAttribute('data-held', 'true');

  // it is still there on a cold load, and none of it cost a pixel of shift
  await page.reload();
  await expect(page.locator('#section-dog .blk[data-id="contra-clicks"]')).toBeVisible();
  expect(await shift()).toBe(0);
});

test('all five lines are readable by a reader who has earned them', async ({ page }) => {
  await seedState(page, {
    keys: allAsides(CORPUS).map((a) => a.id),
    collected: CORPUS.contradictions.map((c) => c.id),
    visited: [...ACCOUNT_SLUGS],
    visits: Object.fromEntries(ACCOUNT_SLUGS.map((s) => [s, 1])),
  });
  for (const c of CORPUS.contradictions) {
    const slug = home(c.needs);
    await page.goto(`/?s=${slug}`);
    const line = page.locator(`#section-${slug} .blk[data-id="contra-${c.id}"]`);
    await expect(line, `${c.id} is not in ${slug}`).toBeVisible();
    await expect(line).toHaveText(c.line);
    // it is the last thing in the account, so every reader who reaches the
    // ask card has passed it
    await expect(
      page.locator(`#section-${slug} .blocks > .blk:visible`).last(),
    ).toHaveAttribute('data-id', `contra-${c.id}`);
  }
});

test('a contradiction nobody has earned is not in the reading', async ({ page }) => {
  for (const c of CORPUS.contradictions) {
    const slug = home(c.needs);
    await page.goto(`/?s=${slug}`);
    await expect(page.locator(`#section-${slug} h2`)).toBeVisible();
    await expect(page.locator(`#section-${slug} .blk[data-id="contra-${c.id}"]`)).toBeHidden();
    expect((await page.locator(`#section-${slug}`).innerText()).toLowerCase()).not.toContain(
      c.line.slice(0, 40).toLowerCase(),
    );
  }
});
