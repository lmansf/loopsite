import type { Account } from '@/content/schema';
import { CORPUS } from '@/content/accounts';
import { LANDING_ACCOUNT } from '@/lib/boot';
import { escapeHtml } from '@/content/compile';

/**
 * the night — twelve slots, in flow at the top of each account (§C.7, §I.7).
 * Server component. **OWNED BY WP-C.**
 *
 * One `<nav>` per account lives in the DOM, so the active slot's
 * `aria-current` and the whole navigation are correct in the served document
 * with zero JavaScript; CSS shows exactly one of them at a time, so exactly
 * one is ever rendered to the reader.
 *
 * Three states, never colour alone (§C.7):
 *   unread   a hollow mark — a 1 px ring, no fill
 *   read     a filled mark plus an inner hairline rule
 *   changed  a filled mark plus a SECOND SHORT BAR above it
 *
 * Every slot is a real anchor to a real static route. `data-state` is
 * server-rendered `read` for the landing account and `unread` for the other
 * eleven, then corrected by the runtime; the marks are fixed-size and
 * position-reserved, so correcting them costs no layout shift.
 *
 * ## Why this is a string and not JSX
 *
 * Twelve navs of twelve slots is 144 anchors of four elements each. As JSX
 * that is ~720 element descriptors in React's inline flight payload, which
 * measured at about 4 KB gz of the 18 KB flight budget (§E) — a quarter of it,
 * for markup that is completely static and is never hydrated. Built as one
 * memoised string per account it costs the text and nothing else, exactly as
 * the prose does and for exactly the same reason.
 *
 * WP-C still owns every byte of this markup. If the flight budget ever gains
 * room, turning it back into JSX is a local change to this file alone.
 */

const CACHE = new Map<string, string>();

function slot(
  account: Account,
  active: string,
): string {
  const state = account.id === LANDING_ACCOUNT ? 'read' : 'unread';
  const title = escapeHtml(account.title);
  const current = account.id === active ? ' aria-current="page"' : '';
  return (
    `<a href="/?s=${account.id}" data-slug="${account.id}" data-state="${state}"${current}>` +
    `<span class="mark" aria-hidden="true"></span>` +
    `<span class="label">${title}</span>` +
    `<span class="gap" aria-hidden="true">${escapeHtml(account.standfirst)}</span>` +
    `<span class="u-sr" data-slot-state>${state === 'read' ? `${title} — read` : title}</span>` +
    `</a>`
  );
}

function nightHtml(active: string): string {
  const hit = CACHE.get(active);
  if (hit) return hit;
  const html = CORPUS.accounts.map((a) => slot(a, active)).join('');
  CACHE.set(active, html);
  return html;
}

export function TheNight({ account }: { account: Account }) {
  return (
    <nav
      className="night"
      aria-label="the night"
      dangerouslySetInnerHTML={{ __html: nightHtml(account.id) }}
    />
  );
}
