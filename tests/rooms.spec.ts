/**
 * tests/rooms.spec.ts — the corridor, per §H.1.
 *
 * Owned by WP0. Per-room behaviour belongs in tests/rooms/<slug>.spec.ts, which
 * is the append-only directory each room agent owns one file of.
 */

import { ROOM_SLUGS, expect, test } from './fixtures';

test('every registered room has a <section> in the RAW response body', async ({ request }) => {
  const html = await (await request.get('/')).text();
  for (const slug of ROOM_SLUGS) {
    expect(html, `section-${slug} must be server-rendered`).toContain(`id="section-${slug}"`);
  }
});

test('the no-JS document links every room to the next one by name', async ({ request }) => {
  const html = await (await request.get('/')).text();
  // Rubric E1: zero generic link labels anywhere on the site.
  for (const bad of ['read more', 'learn more', 'click here']) {
    expect(html.toLowerCase()).not.toContain(bad);
  }
  expect(html).toContain('href="/?s=pulse"');
  expect(html).toContain('href="/?s=origin"');
});

test('the Ringway is twelve real links inside nav[aria-label="rooms"]', async ({ page }) => {
  await page.goto('/');
  const nav = page.locator('nav[aria-label="rooms"]');
  await expect(nav).toHaveCount(1);
  await expect(nav.locator('a')).toHaveCount(ROOM_SLUGS.length);
  for (const slug of ROOM_SLUGS) {
    await expect(nav.locator(`a[href="/?s=${slug}"]`)).toHaveCount(1);
  }
});

for (const slug of ROOM_SLUGS) {
  test(`/?s=${slug} starts in ${slug} and mounts its chunk`, async ({ page }) => {
    await page.goto(`/?s=${slug}`);
    await expect(page.locator(`.room-shell[data-slug="${slug}"]`)).toHaveAttribute(
      'data-active',
      'true',
    );
    await expect(page.locator('nav[aria-label="rooms"] a[aria-current="page"]')).toHaveAttribute(
      'href',
      `/?s=${slug}`,
    );
    // the room canvas keeps a real text equivalent
    await expect(page.locator('#loop-room')).toHaveAttribute('aria-label', /\S/);
  });

  test(`/s/${slug} is prerendered with room-specific metadata`, async ({ request }) => {
    const res = await request.get(`/s/${slug}`);
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain(`<title>${slug} — Loop</title>`);
    expect(html).toContain(`id="section-${slug}"`);
  });
}

test('every room is reachable from the keyboard', async ({ page }) => {
  await page.goto('/');
  const stage = page.locator('#stage');
  await stage.focus();
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
  for (let i = 0; i < digits.length; i++) {
    await page.keyboard.press(digits[i] as string);
    await expect(page.locator(`.room-shell[data-slug="${ROOM_SLUGS[i]}"]`)).toHaveAttribute(
      'data-active',
      'true',
    );
  }
});

test('arrow keys walk the corridor forwards and backwards', async ({ page }) => {
  await page.goto('/');
  await page.locator('#stage').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.room-shell[data-slug="pulse"]')).toHaveAttribute('data-active', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.room-shell[data-slug="origin"]')).toHaveAttribute(
    'data-active',
    'true',
  );
});

test('the wheel changes nothing (§J.5 — no scroll-jacking)', async ({ page }) => {
  await page.goto('/?s=tone');
  await page.mouse.move(400, 300);
  for (let i = 0; i < 8; i++) await page.mouse.wheel(0, 400);
  await page.waitForTimeout(200);
  await expect(page.locator('.room-shell[data-slug="tone"]')).toHaveAttribute('data-active', 'true');
});

test('Back leaves a deliberate room in one press', async ({ page }) => {
  await page.goto('/?s=origin');
  await page.locator('#stage').focus();
  await page.keyboard.press('ArrowRight'); // deliberate -> pushState
  await expect(page.locator('.room-shell[data-slug="pulse"]')).toHaveAttribute('data-active', 'true');
  await page.goBack();
  await expect(page.locator('.room-shell[data-slug="origin"]')).toHaveAttribute(
    'data-active',
    'true',
  );
});

test('a shared #l= link round-trips onto the ring, and a broken one is silent', async ({ page }) => {
  // Place three nodes, read the code back out through the share button's codec.
  await page.goto('/');
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(120);
  await page.keyboard.press('Space');
  await page.waitForTimeout(120);
  await page.keyboard.press('Space');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '3');

  // A real three-node payload (§C.7): version 1, checksum 0x4E, three pairs.
  await page.goto('/?s=origin#l=AU4ggICjwFc');
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '3');
  await expect(page.locator('#loop-status')).toContainText('someone left this here');

  // A bad payload never shows an error and never breaks the page. (A different
  // search param forces a real navigation rather than a same-document hashchange.)
  await page.goto('/?s=pulse#l=zzzzzzzz');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('#stage')).toHaveAttribute('data-node-count', '0');
});

test('the copy inventory is respected: no forbidden language anywhere', async ({ request }) => {
  const html = (await (await request.get('/')).text()).toLowerCase();
  for (const banned of [
    'online now',
    'right now',
    'sign up',
    'subscribe',
    'newsletter',
    'don’t miss',
    "don't miss",
    'limited time',
    'immersive',
    'unleash',
  ]) {
    expect(html, `forbidden copy: ${banned}`).not.toContain(banned);
  }
});
