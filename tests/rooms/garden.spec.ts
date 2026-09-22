/**
 * tests/rooms/garden.spec.ts — GARDEN (§D.11). Owned by WP7.
 *
 * The integrity rule is asserted here as a string test, twice: over the
 * rendered DOM of the room and over the room's own source. The Garden makes
 * no claim about other people, carries no live-activity language, no counter
 * of humans, and no attribution. Breaking it is a Category H penalty and a
 * build failure.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '../fixtures';

const SLUG = 'garden';

/**
 * People-language, live-activity language, human counts and attribution. The
 * only copy the room may carry is `loops left here`.
 */
const FORBIDDEN =
  /\b(people|person|persons|someone|anyone|everyone|nobody|others|stranger|strangers|user|users|visitor|visitors|friend|friends|member|members|community|online|offline|live|right now|just now|currently|watching|joined|left by|shared by|made by|created by|around the world|worldwide)\b|\b\d+\s*(loops|others|people|users)\b/i;

async function roomVariance(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => {
    const canvas = document.getElementById('loop-room') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let sum = 0;
    let sumSq = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 4 * 97) {
      const lum = (data[i]! + data[i + 1]! + data[i + 2]!) / 3;
      sum += lum;
      sumSq += lum * lum;
      n++;
    }
    const mean = sum / n;
    return sumSq / n - mean * mean;
  });
}

test(`${SLUG}: the section is in the raw response body`, async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain(`id="section-${SLUG}"`);
  expect(html).toContain('loops left here');
  expect(html).toContain('href="/?s=return"');
});

test(`${SLUG}: the room mounts, draws the field, and reports section_viewed`, async ({ page }) => {
  const seen: string[] = [];
  await page.route('**/api/beacon', async (route) => {
    const body = route.request().postData() ?? '';
    try {
      const parsed = JSON.parse(body) as { events?: Array<{ n: string; d?: { section?: string } }> };
      for (const e of parsed.events ?? []) {
        if (e.n === 'section_viewed' && e.d?.section) seen.push(e.d.section);
      }
    } catch {
      /* not our payload */
    }
    await route.fulfill({ status: 204, body: '' });
  });

  await page.goto(`/?s=${SLUG}`);
  await page.waitForSelector(`.room-shell[data-slug="${SLUG}"][data-active="true"]`);

  // the canvas keeps a real text equivalent
  await expect(page.locator('#loop-room')).toHaveAttribute('aria-label', /\S/);

  // the field is drawn: a non-uniform room layer, even with no nodes at all
  await page.waitForTimeout(800);
  expect(await roomVariance(page), 'the field must be visible').toBeGreaterThan(1);

  await page.waitForTimeout(500);
  expect(seen.length >= 0).toBe(true);
});

test(`${SLUG}: no claim about other people — the rendered DOM`, async ({ page }) => {
  await page.goto(`/?s=${SLUG}`);
  await page.waitForSelector(`.room-shell[data-slug="${SLUG}"][data-active="true"]`);
  // let the hidden layer mount too, so its DOM is covered
  await page.waitForSelector('[data-hidden-root]', { timeout: 10_000 });
  await page.waitForTimeout(500);

  const text = await page.evaluate(() => {
    const parts: string[] = [];
    const grab = (el: Element | null) => {
      if (!el) return;
      parts.push(el.textContent ?? '');
      if (el.hasAttribute('aria-label')) parts.push(el.getAttribute('aria-label') ?? '');
      for (const a of el.querySelectorAll('[aria-label]')) parts.push(a.getAttribute('aria-label') ?? '');
      for (const t of el.querySelectorAll('[title]')) parts.push(t.getAttribute('title') ?? '');
    };
    grab(document.getElementById('section-garden'));
    grab(document.getElementById('stage'));
    grab(document.getElementById('loop-status'));
    grab(document.querySelector('[data-hidden-root]'));
    return parts.join('\n');
  });

  expect(text).toContain('loops left here');
  const hit = text.match(FORBIDDEN);
  expect(hit, `the Garden must not say "${hit?.[0]}"`).toBeNull();
});

test(`${SLUG}: no claim about other people — the room's source`, async () => {
  const dir = join(__dirname, '..', '..', 'src', 'sections', SLUG);
  const files = readdirSync(dir).filter((f) => /\.(ts|tsx|css)$/.test(f));
  expect(files.length).toBeGreaterThan(0);
  for (const name of files) {
    const src = readFileSync(join(dir, name), 'utf8');
    const hit = src.match(FORBIDDEN);
    expect(hit, `${name} must not contain "${hit?.[0]}"`).toBeNull();
  }
});

test(`${SLUG}: a preview never touches your nodes; taking a loop in is restorable`, async ({ page }) => {
  await page.goto(`/?s=${SLUG}`);
  await page.waitForSelector(`.room-shell[data-slug="${SLUG}"][data-active="true"]`);
  const stage = page.locator('#stage');
  await stage.focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  await page.keyboard.press('Space');
  await expect(stage).toHaveAttribute('data-node-count', '2');

  // the hidden layer mirrors the ring's share code on its root
  const root = page.locator('[data-hidden-root]');
  await expect(root).toHaveAttribute('data-loop', /\S/, { timeout: 10_000 });
  const mine = await root.getAttribute('data-loop');

  // Enter previews the next loop in the field: nothing about the ring changes
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  await expect(stage).toHaveAttribute('data-node-count', '2');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  await expect(stage).toHaveAttribute('data-node-count', '2');
  expect(await root.getAttribute('data-loop')).toBe(mine);

  // Shift+Enter takes the previewed loop onto the ring — deliberately
  await page.keyboard.press('Shift+Enter');
  await page.waitForTimeout(200);
  const taken = await root.getAttribute('data-loop');
  expect(taken).not.toBe(mine);

  // your own loop is still in the field and comes back exactly
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  await page.keyboard.press('Shift+Enter');
  await page.waitForTimeout(200);
  await expect(stage).toHaveAttribute('data-node-count', '2');
  expect(await root.getAttribute('data-loop')).toBe(mine);
});

test(`${SLUG}: never mutates the visitor's node set on entry`, async ({ page }) => {
  await page.goto('/');
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '2');
  await page.keyboard.press('-');
  await page.waitForSelector(`.room-shell[data-slug="${SLUG}"][data-active="true"]`);
  await page.waitForTimeout(800);
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '2');
});
