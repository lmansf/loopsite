/**
 * tests/smoke.spec.ts — the gate every other spec assumes.
 * **OWNED BY WP-D.** Spec: §H.2, last entry.
 *
 * `/` returns 200 with one `<h1>`; `html[data-loop-js]` and `html[data-s]` are
 * set within 1000 ms of `waitUntil: 'commit'`; the first `<summary>` press is
 * handled natively **before React hydrates**; CLS after a full session is
 * exactly 0; and the shared fixture applies "zero console errors, zero
 * pageerror, no response >= 400" to every spec in the suite, this one
 * included.
 */

import { readFile } from 'node:fs/promises';
import {
  test,
  expect,
  LANDING,
  ACCOUNT_SLUGS,
  seedState,
  watchLayoutShift,
  type Page,
} from './fixtures';
import { ASIDE_BYTES, encodePayload } from '../src/lib/share';
import { ASIDES, ASIDE_BIT } from '../src/lib/knowledge';

/** A real, valid share code carrying three real keys. */
function threeKeyCode(): string {
  const asides = new Uint8Array(ASIDE_BYTES);
  for (const key of [ASIDES[0], ASIDES[21], ASIDES[42]]) {
    const bit = ASIDE_BIT.get(key as string) as number;
    asides[bit >> 3] = (asides[bit >> 3] as number) | (1 << (bit & 7));
  }
  return encodePayload({
    version: 1,
    belief: 1,
    pass: 1,
    visited: 0b111,
    contradictions: 0,
    asides,
  });
}

test('/ returns 200 with one h1 and the bootstrap attributes set', async ({ page }) => {
  const response = await page.goto('/', { waitUntil: 'commit' });
  expect(response?.status()).toBe(200);
  await expect
    .poll(
      () =>
        page.evaluate(() => ({
          js: document.documentElement.hasAttribute('data-loop-js'),
          s: document.documentElement.getAttribute('data-s'),
        })),
      { timeout: 1000 },
    )
    .toEqual({ js: true, s: LANDING });
  await expect(page.locator('h1')).toHaveCount(1);
});

test('the first summary press is handled before React hydrates', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' });
  const summary = page.locator('#section-dog details.aside:not([open]) > summary').first();
  await summary.click();
  await expect(page.locator('#section-dog details.aside[open]')).toHaveCount(2);
});

test('the alias route redirects to the canonical one', async ({ page }) => {
  await page.goto('/s/kettle');
  await page.waitForURL(/\?s=kettle/);
  await expect(page.locator('#section-kettle')).toBeVisible();
});

test('CLS after a full session is exactly 0', async ({ page }) => {
  const cls = await watchLayoutShift(page);
  await page.goto('/');
  await expect(page.locator('#section-dog')).toBeVisible();

  // open two asides
  for (const n of [0, 1]) {
    const summary = page.locator('#section-dog details.aside:not([open]) > summary').nth(n);
    if (await summary.count()) await summary.click();
  }
  // walk every account
  for (const slug of ACCOUNT_SLUGS) {
    await page.goto(`/?s=${slug}`);
    await expect(page.locator(`#section-${slug}`)).toBeVisible();
  }
  // come back, reload, and press the two footer controls
  await page.goto('/?s=dog');
  await page.reload();
  await expect(page.locator('#section-dog')).toBeVisible();
  await page.locator('[data-control="share"]').click();
  await page.waitForTimeout(300);

  expect(await cls(), 'CLS across a full session is 0 by construction (§E)').toBe(0);
});

test('an inbound share link costs no layout shift either', async ({ page }) => {
  // The merge is deferred past the runtime's entry precisely so that no block
  // materialises after first paint (§C.6, and the header of InboundShare.tsx).
  const cls = await watchLayoutShift(page);
  await page.goto(`/?s=road#n=${threeKeyCode()}`);
  await expect(page.locator('#section-road')).toBeVisible();
  await expect
    .poll(
      () =>
        page.evaluate(
          () => (JSON.parse(window.localStorage.getItem('loop:v2') ?? '{}').keys ?? []).length,
        ),
      { timeout: 8000 },
    )
    .toBe(3);
  expect(await cls()).toBe(0);
});

test('nothing is fetched from a third party', async ({ page }) => {
  const foreign: string[] = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost' && url.protocol !== 'data:') {
      foreign.push(r.url());
    }
  });
  await page.goto('/');
  await expect(page.locator('#section-dog')).toBeVisible();
  await page.waitForTimeout(500);
  expect(foreign, 'zero third-party origins (§E item 5)').toEqual([]);
});

/* -------------------------------------------------------- `keep this` */

test('keep this produces a real PNG', async ({ page }) => {
  await page.goto('/?s=dog');
  await expect(page.locator('#section-dog')).toBeVisible();
  // a couple of marks in two different states, so the image is not uniform
  const summary = page.locator('#section-dog details.aside:not([open]) > summary').first();
  if (await summary.count()) await summary.click();

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15_000 }),
    page.locator('[data-control="keep"]').click(),
  ]);
  expect(download.suggestedFilename()).toBe('loop.png');

  const path = await download.path();
  const bytes = await readFile(path);
  // the PNG signature, then IHDR with the real pixel dimensions
  expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  expect(bytes.subarray(12, 16).toString('ascii')).toBe('IHDR');
  const w = bytes.readUInt32BE(16);
  const h = bytes.readUInt32BE(20);
  expect(w).toBeGreaterThanOrEqual(1024);
  expect(h).toBeGreaterThanOrEqual(640);
  expect(bytes.length).toBeGreaterThan(1000);
});

/* ------------------------------------------------------------ the beacon */

/**
 * Every `/api/beacon` body the page sends, decoded.
 *
 * `navigator.sendBeacon` is removed first so the module takes its own
 * documented fallback — `fetch(..., { keepalive: true })` — which is the same
 * queue, the same payload, and a request a test can actually read: a beacon
 * dispatched during unload is not reliably observable from here.
 */
async function watchBeacon(
  page: Page,
): Promise<{ events: { n: string; d?: Record<string, unknown> }[] }> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'sendBeacon', { value: undefined, configurable: true });
  });
  const seen: { n: string; d?: Record<string, unknown> }[] = [];
  page.on('request', (r) => {
    if (!r.url().includes('/api/beacon')) return;
    try {
      const body = JSON.parse(r.postData() ?? '{}') as {
        events?: { n: string; d?: Record<string, unknown> }[];
      };
      for (const e of body.events ?? []) seen.push(e);
    } catch {
      /* a body we cannot read is a failure the assertion will show */
    }
  });
  return { events: seen };
}

/** The flush the beacon does when the tab is hidden (§C.14), without hiding it. */
async function flushBeacon(page: Page): Promise<void> {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

test('the beacon sends session_start, word_pressed and account_viewed, and no identity', async ({
  page,
}) => {
  const wire = await watchBeacon(page);
  await page.goto('/?s=dog');
  await expect(page.locator('#section-dog')).toBeVisible();
  await page.locator('#section-dog details.aside:not([open]) > summary').first().click();
  await page.waitForTimeout(1400);
  await flushBeacon(page);
  await expect.poll(() => wire.events.map((e) => e.n), { timeout: 8000 }).toContain('session_start');

  const names = wire.events.map((e) => e.n);
  expect(names).toContain('word_pressed');
  expect(names).toContain('account_viewed');
  // Only the five wire events of §C.14 exist.
  const ALLOWED = [
    'session_start',
    'word_pressed',
    'account_viewed',
    'contradiction_found',
    'time_on_site_30s',
  ];
  for (const n of names) expect(ALLOWED).toContain(n);
  // Deduped to once per session; account_viewed once per account.
  expect(names.filter((n) => n === 'session_start')).toHaveLength(1);
  expect(names.filter((n) => n === 'word_pressed')).toHaveLength(1);
  // No identity, ever: the only payload keys are the account and the
  // contradiction, and no cookie is ever set.
  for (const e of wire.events) {
    for (const key of Object.keys(e.d ?? {})) expect(['account', 'id', 'n']).toContain(key);
  }
  expect(await page.context().cookies()).toEqual([]);
});

test('the beacon refuses to send under Do Not Track', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true });
  });
  const wire = await watchBeacon(page);
  await page.goto('/?s=dog');
  await expect(page.locator('#section-dog')).toBeVisible();
  await page.locator('#section-dog details.aside:not([open]) > summary').first().click();
  await page.waitForTimeout(1500);
  await flushBeacon(page);
  await page.waitForTimeout(600);
  expect(wire.events, 'nothing is sent under GPC / DNT (§C.14)').toEqual([]);
  expect(await page.context().cookies()).toEqual([]);
});

/* ---------------------------------------------------------- the fixture */

test('a seeded state is seeded once, and the session survives a reload', async ({ page }) => {
  // The guard on `seedState`: if the seed re-applied on every document it
  // would wipe whatever the session wrote, and every persistence assertion in
  // every package would pass or fail for the wrong reason.
  await seedState(page, { keys: [], visited: [] });
  await page.goto('/?s=dog');
  await expect(page.locator('#section-dog')).toBeVisible();
  await page.locator('#section-dog details.aside:not([open]) > summary').first().click();
  await expect
    .poll(
      () =>
        page.evaluate(
          () => (JSON.parse(window.localStorage.getItem('loop:v2') ?? '{}').keys ?? []).length,
        ),
      { timeout: 5000 },
    )
    .toBeGreaterThan(0);
  const before = await page.evaluate(
    () => JSON.parse(window.localStorage.getItem('loop:v2') ?? '{}').keys as string[],
  );

  await page.reload();
  await expect(page.locator('#section-dog')).toBeVisible();
  await page.waitForTimeout(600);
  const after = await page.evaluate(
    () => JSON.parse(window.localStorage.getItem('loop:v2') ?? '{}').keys as string[],
  );
  expect(after, 'the seed must not re-apply on reload').toEqual(before);
});
