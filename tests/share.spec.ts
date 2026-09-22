/**
 * tests/share.spec.ts — the round trip in a real browser.
 * **OWNED BY WP-D.** Spec: §C.11, §H.2.
 *
 * The unit test proves the codec. This proves the four things only a browser
 * can: that a link opened on a clean profile restores understanding, that it
 * **unions** with what the reader already had and never removes anything,
 * that it never claims the reader is somebody else, and that a hostile `#n=`
 * loads the site silently on the reader's own state with no error anywhere.
 *
 * Codes are built here with the site's own codec, imported directly — a
 * fixture that encodes differently from the site proves nothing — and the
 * clipboard path is checked once, on its own, where it belongs.
 */

import { test, expect, seedState, type Page } from './fixtures';
import { encodePayload, ASIDE_BYTES, type SharedState } from '../src/lib/share';
import { ACCOUNT_IDS, ASIDES, ASIDE_BIT, CONTRADICTIONS } from '../src/lib/knowledge';

interface Held {
  keys?: readonly string[];
  visited?: readonly string[];
  collected?: readonly string[];
  belief?: 0 | 1 | 2;
  pass?: number;
}

/** A share code for an arbitrary state, from the real encoder. */
function codeFor(held: Held): string {
  const asides = new Uint8Array(ASIDE_BYTES);
  for (const key of held.keys ?? []) {
    const bit = ASIDE_BIT.get(key);
    if (bit === undefined) throw new Error(`${key} is not an aside`);
    asides[bit >> 3] = (asides[bit >> 3] as number) | (1 << (bit & 7));
  }
  let visited = 0;
  for (const id of held.visited ?? []) {
    const i = (ACCOUNT_IDS as readonly string[]).indexOf(id);
    if (i >= 0) visited |= 1 << i;
  }
  let contradictions = 0;
  for (const id of held.collected ?? []) {
    const i = CONTRADICTIONS.findIndex((c) => c.id === id);
    if (i >= 0) contradictions |= 1 << i;
  }
  const state: SharedState = {
    version: 1,
    belief: held.belief ?? 0,
    pass: held.pass ?? 0,
    visited,
    contradictions,
    asides,
  };
  return encodePayload(state);
}

async function stored(page: Page): Promise<{
  keys: string[];
  visited: string[];
  collected: string[];
  belief: number;
  pass: number;
}> {
  return page.evaluate(() => {
    const raw = JSON.parse(window.localStorage.getItem('loop:v2') ?? '{}') as Record<string, unknown>;
    return {
      keys: (raw.keys as string[]) ?? [],
      visited: (raw.visited as string[]) ?? [],
      collected: (raw.collected as string[]) ?? [],
      belief: (raw.belief as number) ?? 0,
      pass: (raw.pass as number) ?? 0,
    };
  });
}

/** Three real aside ids, spread across the bitfield so all six bytes are used. */
const K0 = ASIDES[0] as string;
const K1 = ASIDES[21] as string;
const K2 = ASIDES[42] as string;

test('the codec is the shipped one: 43 asides, six bytes, fifteen characters', () => {
  expect(ASIDES.length).toBe(43);
  expect(ASIDE_BYTES).toBe(6);
  expect(codeFor({ keys: ASIDES })).toHaveLength(15);
});

test('a link opened on a clean profile restores understanding', async ({ page }) => {
  const code = codeFor({
    keys: [K0, K1, K2],
    visited: ['dog', 'lamp', 'kettle'],
    belief: 2,
    pass: 1,
  });
  await page.goto(`/?s=road#n=${code}`);
  await expect(page.locator('#section-road')).toBeVisible();
  await expect.poll(async () => (await stored(page)).keys.length, { timeout: 8000 }).toBe(3);

  const got = await stored(page);
  expect([...got.keys].sort()).toEqual([K0, K1, K2].sort());
  for (const id of ['dog', 'lamp', 'kettle']) expect(got.visited).toContain(id);
  expect(got.belief).toBe(2);
  expect(got.pass).toBeGreaterThanOrEqual(1);
});

test('all forty-three asides and all five contradictions survive a real link', async ({ page }) => {
  const code = codeFor({
    keys: ASIDES,
    visited: ACCOUNT_IDS as readonly string[],
    collected: CONTRADICTIONS.map((c) => c.id),
    belief: 1,
    pass: 3,
  });
  expect(code).toHaveLength(15);
  await page.goto(`/?s=four-seconds#n=${code}`);
  await expect.poll(async () => (await stored(page)).keys.length, { timeout: 8000 }).toBe(43);
  const got = await stored(page);
  expect([...got.keys].sort()).toEqual([...ASIDES].sort());
  expect([...got.collected].sort()).toEqual(CONTRADICTIONS.map((c) => c.id).sort());
  expect(got.visited).toHaveLength(12);
  // The hub is the only numeral the UI prints, and it reads the real count.
  await expect
    .poll(
      () => page.evaluate(() => [...document.querySelectorAll('.hub')].map((h) => h.textContent)),
      { timeout: 8000 },
    )
    .toContain(`${CONTRADICTIONS.length}/${CONTRADICTIONS.length}`);
});

test('the caption says someone read it this way, and names nobody', async ({ page }) => {
  await page.goto(`/?s=lamp#n=${codeFor({ keys: [K0] })}`);
  await expect(page.locator('#loop-live')).toHaveText('someone read it this way', { timeout: 8000 });

  // Nothing anywhere claims the reader is anyone, attributes the state to a
  // person, or counts one (§C.11, rubric H).
  const body = (await page.locator('body').innerText()).toLowerCase();
  for (const phrase of [
    'someone else',
    'your friend',
    'shared by',
    'sent by',
    'people have',
    'readers',
    'others have',
  ]) {
    expect(body, `the page says "${phrase}"`).not.toContain(phrase);
  }

  // And the hash is dropped, so Back is never polluted.
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('');
  // It is announced once and then released, not left in the live region.
  await expect(page.locator('#loop-live')).toHaveText('', { timeout: 8000 });
});

test('no caption is announced when there was no readable code', async ({ page }) => {
  await page.goto('/?s=lamp#n=not-a-real-code');
  await expect(page.locator('#section-lamp')).toBeVisible();
  await page.waitForTimeout(1200);
  await expect(page.locator('#loop-live')).toHaveText('');
});

test('an inbound link unions with what the reader earned, and removes nothing', async ({ page }) => {
  await seedState(page, { keys: [K0], visited: ['dog'], collected: [], belief: 0, pass: 0 });
  await page.goto('/?s=dog');
  await expect.poll(async () => (await stored(page)).keys).toEqual([K0]);

  await page.goto(`/?s=dog#n=${codeFor({ keys: [K1, K2], visited: ['river', 'bus'] })}`);
  await expect.poll(async () => (await stored(page)).keys.length, { timeout: 8000 }).toBe(3);
  const merged = await stored(page);
  // The union, in both directions. A link can only ever give.
  for (const k of [K0, K1, K2]) expect(merged.keys).toContain(k);
  for (const id of ['dog', 'river', 'bus']) expect(merged.visited).toContain(id);
});

test('an empty link takes nothing away', async ({ page }) => {
  await seedState(page, { keys: [K0, K1], visited: ['dog', 'lamp'], belief: 1, pass: 2 });
  await page.goto('/?s=dog');
  await expect.poll(async () => (await stored(page)).keys.length).toBe(2);

  await page.goto(`/?s=dog#n=${codeFor({})}`);
  await page.waitForTimeout(1200);
  const after = await stored(page);
  expect([...after.keys].sort()).toEqual([K0, K1].sort());
  expect(after.visited).toContain('lamp');
  expect(after.belief).toBe(1);
  expect(after.pass).toBe(2);
});

test("an incoming belief never overwrites the reader's own", async ({ page }) => {
  const hill = codeFor({ keys: [K0], belief: 2 });

  // A reader who already believes `valley` keeps it.
  await seedState(page, { keys: [], belief: 1 });
  await page.goto('/?s=dog');
  await expect.poll(async () => (await stored(page)).belief).toBe(1);
  await page.goto(`/?s=dog#n=${hill}`);
  await page.waitForTimeout(1200);
  expect((await stored(page)).belief).toBe(1);
  // and the key still arrived: the link gave what it could give
  expect((await stored(page)).keys).toContain(K0);
});

test('a reader with no belief takes the one the link carries', async ({ page }) => {
  await page.goto(`/?s=dog#n=${codeFor({ keys: [K0], belief: 2 })}`);
  await expect.poll(async () => (await stored(page)).belief, { timeout: 8000 }).toBe(2);
});

const HOSTILE: readonly [string, string][] = [
  ['a word', 'not-a-real-code'],
  ['a well-formed length with a bad checksum', 'AAAAAAAAAAAAAAA'],
  ['eleven As', 'AAAAAAAAAAA'],
  ['empty', ''],
  ['one character', 'A'],
  ['punctuation', '!!!!!!!!!!!!!!!'],
  ['far too long', 'A'.repeat(52)],
  ['a script tag', '<script>alert(1)</script>'],
  ['an encoded script tag', '%3Cscript%3Ealert(1)%3C%2Fscript%3E'],
  ['a path traversal', '../../etc/passwd'],
  ['an embedded null', 'AAAA%00AAAA'],
  ['four thousand characters', 'A'.repeat(4000)],
  ['a fragment inside a fragment', '#n=AAAAAAAAAAAAAAA'],
];

for (const [name, code] of HOSTILE) {
  test(`a hostile code loads the site silently: ${name}`, async ({ page }) => {
    await page.goto(`/?s=road#n=${code}`);
    await expect(page.locator('#section-road')).toBeVisible();
    await expect(page.locator('#section-road h2')).toBeVisible();
    await page.waitForTimeout(700);

    // Nothing granted, nothing announced, nothing said.
    const state = await stored(page);
    expect(state.keys).toEqual([]);
    expect(state.collected).toEqual([]);
    expect(state.belief).toBe(0);
    await expect(page.locator('#loop-live')).toHaveText('');
    // the fixture asserts zero console errors, zero pageerror and no 4xx/5xx
  });
}

test('a truncated code is ignored or a subset — never an invention', async ({ page }) => {
  const full = [K0, K1, K2];
  const code = codeFor({ keys: full, visited: ['dog', 'lamp'] });
  for (const cut of [2, 4, 8, 11, 14]) {
    await page.goto(`/?s=dog#n=${code.slice(0, cut)}`);
    await expect(page.locator('#section-dog')).toBeVisible();
    await page.waitForTimeout(500);
    for (const k of (await stored(page)).keys) {
      expect(full, `a ${cut}-character truncation invented ${k}`).toContain(k);
    }
    await page.evaluate(() => window.localStorage.removeItem('loop:v2'));
  }
});

test('the share control copies a fifteen-character code for the account on screen', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await seedState(page, { keys: [K0, K1], visited: ['dog'] });
  await page.goto('/');
  await page.locator('.night > a[data-slug="moth"]').first().click();
  await expect(page.locator('#section-moth')).toBeVisible();

  await page.locator('[data-control="share"]').click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()), { timeout: 8000 })
    .toMatch(/\/\?s=moth#n=[A-Za-z0-9_-]{15}$/);
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url.slice(url.indexOf('#n=') + 3)).toHaveLength(15);

  // The site never writes a hash of its own: copying one does not put it in
  // the address bar, so Back is never polluted (§C.11).
  expect(await page.evaluate(() => location.hash)).toBe('');
});

test('a copied link round-trips to a second reader', async ({ page, context, browser }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await seedState(page, { keys: [K0, K1, K2], visited: ['dog', 'lamp'], belief: 2, pass: 1 });
  await page.goto('/?s=road');
  await page.locator('[data-control="share"]').click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()), { timeout: 8000 })
    .toContain('#n=');
  const url = await page.evaluate(() => navigator.clipboard.readText());

  const fresh = await browser.newContext();
  const b = await fresh.newPage();
  const problems: string[] = [];
  b.on('console', (m) => {
    if (m.type() === 'error') problems.push(m.text());
  });
  b.on('pageerror', (e) => problems.push(String(e)));
  await b.goto(url.slice(url.indexOf('/?s=')));
  await expect
    .poll(
      async () =>
        b.evaluate(() => (JSON.parse(window.localStorage.getItem('loop:v2') ?? '{}').keys ?? []).length),
      { timeout: 8000 },
    )
    .toBe(3);
  expect(problems).toEqual([]);
  await fresh.close();
});
