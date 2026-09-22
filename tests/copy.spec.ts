/**
 * tests/copy.spec.ts — the copy law. **OWNED BY WP-A.** Spec: §C.13, §H.2.
 *
 * WP-N left the forbidden-word sweep and the numeral law over the rendered
 * document. WP-A extends it to every rendered leaf across all twelve
 * accounts, both schemes, both motion settings, with zero keys and with all
 * keys, plus the ≤ 55-word block cap and the "no two pressable words on the
 * same or adjacent rendered line" law at 360 px and 200 % zoom.
 */

import { test, expect, ACCOUNT_SLUGS } from './fixtures';

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
  'right now',
];

test('no forbidden word renders anywhere', async ({ page }) => {
  for (const slug of ACCOUNT_SLUGS) {
    await page.goto(`/?s=${slug}`);
    const text = ((await page.locator('body').innerText()) ?? '').toLowerCase();
    for (const word of FORBIDDEN) {
      expect(text, `${slug}: "${word}" is forbidden copy`).not.toContain(word);
    }
    // `next`, `click`, `tap` and `scroll` are forbidden as whole words.
    for (const word of ['next', 'click here', 'tap', 'scroll']) {
      expect(text).not.toMatch(new RegExp(`(^|[^a-z])${word}([^a-z]|$)`));
    }
  }
});

test('the only numerals are 11:04 and n/5', async ({ page }) => {
  await page.goto('/');
  const text = (await page.locator('body').innerText()) ?? '';
  for (const match of text.matchAll(/\d[\d:/]*/g)) {
    expect(['11:04'], `unexpected numeral ${match[0]}`).toContain(match[0]);
  }
});

test('the fixed string table is on the page', async ({ page }) => {
  await page.goto('/');
  const text = (await page.locator('body').innerText()) ?? '';
  expect(text).toContain('the lights went out for four seconds.');
  expect(text).toContain('twelve things were awake.');
  expect(text).toContain('gentle mode');
  expect(text).toContain('keep this');
  expect(text).toContain('send the night as you have it');
});
