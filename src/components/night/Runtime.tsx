'use client';

/**
 * src/components/night/Runtime.tsx — **the one client island.**
 *
 * Spec: design/11-narrative-build-spec.md §C.3, §C.6, §C.7, §C.11, §C.15,
 * §D.3. Written by WP-N as a working skeleton; **owned by WP-B thereafter.**
 *
 * It renders no DOM of its own. Everything it does, it does by mutating
 * attributes on markup the server already sent, which is why there is no
 * hydration mismatch anywhere and React never touches the prose.
 *
 * It owns, and nothing else may:
 *
 *  - one delegated `toggle` listener (capture), one delegated `click`
 *    listener and one `keydown` listener, all on `document`;
 *  - account entry — `markEntered`, `data-held` / `data-new` / `aria-hidden`
 *    on the entering account's blocks, and the `html[data-s]` flip, all in ONE
 *    `useLayoutEffect` so it is one paint;
 *  - the night's `data-state` attributes, `aria-current`, the hub and the
 *    live region;
 *  - the belief attribute.
 *
 * **Nothing in the account being read ever changes.** A key granted here
 * marks night slots and ticks the hub; the account on screen is not touched.
 * That is the rule that protects CLS and it is also better storytelling.
 *
 * It imports the ENGINE and never the corpus: `@/lib/knowledge` is built on
 * the generated prose-free graph, so not one word of the story reaches Tier B
 * (§E item 3). `eslint.config.mjs` makes an accidental corpus import here a
 * lint error.
 *
 * Not yet here, and deliberately left to their owners: the ambient figure's
 * idle mount (WP-C), the contradiction lines and their effects (WP-B), the
 * share merge and the `someone read it this way` caption (WP-D).
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { AccountId, Belief, KeyId } from '@/content/schema';
import { ACCOUNT_IDS } from '@/content/schema';
import {
  ACCOUNTS,
  CONTRADICTIONS,
  accountState,
  grantKey,
  markEntered,
  noteOpen,
  readKnowledge,
  setBelief,
  subscribe,
} from '@/lib/knowledge';
import { flushState } from '@/lib/storage';
import { beacon, initBeacon } from '@/lib/beacon';
import { useUrlState } from '@/lib/url-state';
import type { Knowledge } from '@/lib/types';

const ACCOUNT_SET = new Set<string>(ACCOUNT_IDS);
const VIEWED_MS = 1000;

/** `switch — it says more now`, the §C.13 string, joined for one announcement. */
function announce(text: string): void {
  const el = document.getElementById('loop-live');
  if (el) el.textContent = text;
}

function titleOf(slug: string): string {
  const el = document.querySelector(`#section-${CSS.escape(slug)} > h2`);
  return el?.textContent?.trim() ?? slug;
}

/** The night, the hub and the ask bar, repainted from a knowledge snapshot. */
function paintNight(k: Knowledge, active: string): void {
  for (const slot of document.querySelectorAll<HTMLAnchorElement>('.night > a')) {
    const slug = slot.dataset.slug;
    if (!slug || !ACCOUNT_SET.has(slug)) continue;
    const state = accountState(slug as AccountId, k);
    if (slot.dataset.state !== state) slot.dataset.state = state;
    if (slug === active) slot.setAttribute('aria-current', 'page');
    else slot.removeAttribute('aria-current');
    const sr = slot.querySelector('[data-slot-state]');
    if (sr) {
      const title = slot.querySelector('.label')?.textContent ?? slug;
      sr.textContent =
        state === 'changed'
          ? `${title} — it says more now`
          : state === 'read'
            ? `${title} — read`
            : title;
    }
  }
  const n = k.contradictions.size;
  for (const hub of document.querySelectorAll<HTMLElement>('.hub')) {
    hub.dataset.found = String(n);
    const text = n > 0 ? `${n}/${CONTRADICTIONS.length}` : '';
    if (hub.textContent !== text) hub.textContent = text;
  }
}

/**
 * Entry (§C.6). The key set that lays this account out is captured HERE and
 * is not consulted again until the next entry, so no block ever appears while
 * the reader is looking at it.
 */
function materialise(slug: string, k: Knowledge, previousMask: ReadonlySet<KeyId>): void {
  const account = ACCOUNTS.get(slug as AccountId);
  const section = document.getElementById(`section-${slug}`);
  if (!account || !section) return;
  const blank = section.dataset.blank === 'true';
  for (const el of section.querySelectorAll<HTMLElement>('.blk[data-needs]')) {
    const needs = el.dataset.needs;
    if (!needs) continue;
    const held = k.effective.has(needs);
    if (held) {
      el.dataset.held = 'true';
      // New to THIS entry: one entry's worth of `data-new`, which is opacity
      // and a scaleY rule and nothing else — both composited, both excluded
      // from layout by definition (§C.6).
      if (!previousMask.has(needs)) el.dataset.new = 'true';
      else delete el.dataset.new;
      el.removeAttribute('aria-hidden');
    } else {
      delete el.dataset.held;
      delete el.dataset.new;
      // In `four seconds` a locked block is a blank rule of exactly its own
      // width — the real sentence, made transparent. It must not be read out.
      if (blank) el.setAttribute('aria-hidden', 'true');
    }
  }
}

export function Runtime() {
  const { section, belief, setSection } = useUrlState();
  const entered = useRef<string | null>(null);
  const deliberate = useRef(false);
  const firstEntry = useRef(true);
  const viewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- entry: attributes and the html[data-s] flip, in ONE paint (§C.6) ---- */
  useLayoutEffect(() => {
    const slug = ACCOUNT_SET.has(section) ? section : (ACCOUNT_IDS[0] as string);
    if (entered.current === slug) return;
    const wasFirst = firstEntry.current;
    firstEntry.current = false;

    // The mask recorded at this account's LAST entry, read BEFORE markEntered
    // rewrites it. The difference is what gets `data-new` for one entry.
    const previous = new Set<KeyId>(readKnowledge().entry[slug] ?? []);
    markEntered(slug as AccountId);
    const k = readKnowledge();

    materialise(slug, k, previous);
    document.documentElement.dataset.s = slug;
    paintNight(k, slug);
    entered.current = slug;

    // `#loop-keys` did the same job before first paint; the computed result is
    // now identical, so removing it flashes nothing (§C.6).
    if (wasFirst) document.getElementById('loop-keys')?.remove();

    if (!wasFirst && deliberate.current) {
      window.scrollTo(0, 0);
      const h2 = document.getElementById(`h-${slug}`);
      h2?.focus({ preventScroll: true });
    }
    deliberate.current = false;

    if (viewTimer.current) clearTimeout(viewTimer.current);
    viewTimer.current = setTimeout(() => {
      beacon('account_viewed', { account: slug });
    }, VIEWED_MS);
  }, [section]);

  /* ---- the belief mirror (§C.9) ---- */
  useEffect(() => {
    const stored = readKnowledge().belief;
    const value: Belief | null = belief ?? stored;
    if (belief && belief !== stored) setBelief(belief);
    document.documentElement.dataset.belief = value ?? 'none';
  }, [belief]);

  /* ---- the three delegated listeners, and the beacon ---- */
  useEffect(() => {
    initBeacon();

    const unsubscribe = subscribe((k) => paintNight(k, entered.current ?? ''));

    /** A `<details>` opening is the only way a key is ever granted (§C.3). */
    function onToggle(event: Event): void {
      const el = event.target as HTMLElement | null;
      if (!(el instanceof HTMLDetailsElement) || !el.classList.contains('aside')) return;
      const key = el.dataset.key;
      if (!key || !el.open) return;
      el.dataset.held = 'true';
      noteOpen(key);
      const delta = grantKey(key);
      const k = readKnowledge();
      paintNight(k, entered.current ?? '');
      beacon('word_pressed', { account: entered.current ?? '' });
      if (delta.contradictions.length > 0) {
        beacon('contradiction_found', { id: delta.contradictions[0] as string, n: k.contradictions.size });
      }
      if (delta.changed.length > 0) {
        announce(delta.changed.map((id) => `${titleOf(id)} — it says more now`).join(', '));
      }
    }

    /** Every in-site link is a real href; an ordinary click becomes pushState. */
    function onClick(event: MouseEvent): void {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute('href') ?? '';
      if (!href.startsWith('/?s=')) return;
      const url = new URL(href, window.location.origin);
      const slug = url.searchParams.get('s') ?? '';
      if (!ACCOUNT_SET.has(slug)) return;
      event.preventDefault();
      const b = url.searchParams.get('b');
      if (b === 'valley' || b === 'hill') {
        setBelief(b);
        document.documentElement.dataset.belief = b;
      }
      deliberate.current = true;
      setSection(slug, 'push');
    }

    /**
     * §C.15. Handled only when focus is on the body, an account region, a
     * `<summary>` or a night slot, and never with a modifier. `Space`, the
     * arrows that scroll, `Home`, `End`, `PageUp` and `PageDown` are never
     * bound: they belong to the scroller and to the screen reader.
     */
    function onKeyDown(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const active = document.activeElement;
      const ok =
        active === document.body ||
        active === null ||
        active instanceof HTMLHeadingElement ||
        active?.tagName === 'SUMMARY' ||
        (active instanceof HTMLAnchorElement && active.closest('.night') !== null);
      if (!ok) return;

      const here = ACCOUNT_IDS.indexOf((entered.current ?? '') as AccountId);
      const go = (index: number) => {
        const slug = ACCOUNT_IDS[(index + ACCOUNT_IDS.length) % ACCOUNT_IDS.length];
        if (!slug) return;
        event.preventDefault();
        deliberate.current = true;
        setSection(slug, 'push');
      };

      if (event.key === 'ArrowRight') {
        // The account's own `next` — the same destination as the ask control,
        // read off the bar the server rendered rather than assumed from order.
        const bar = document.querySelector<HTMLAnchorElement>(
          `.ask-bar[data-slug="${CSS.escape(entered.current ?? '')}"]`,
        );
        const slot = bar?.dataset.slot ?? '';
        if (ACCOUNT_SET.has(slot)) {
          event.preventDefault();
          deliberate.current = true;
          setSection(slot, 'push');
          return;
        }
        go(here + 1);
        return;
      }
      if (event.key === 'ArrowLeft') {
        go(here - 1);
        return;
      }
      if (event.key === 'Escape') {
        const open = document.querySelectorAll<HTMLDetailsElement>(
          `#section-${CSS.escape(entered.current ?? '')} details.aside[open]`,
        );
        if (open.length === 0) return;
        event.preventDefault();
        for (const d of open) d.open = false;
        return;
      }
      const digits = '1234567890-=';
      const at = digits.indexOf(event.key);
      if (at >= 0 && at < ACCOUNT_IDS.length) go(at);
    }

    function onPageHide(): void {
      flushState();
    }

    document.addEventListener('toggle', onToggle, { capture: true, passive: true });
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      unsubscribe();
      document.removeEventListener('toggle', onToggle, { capture: true });
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [setSection]);

  return null;
}

export default Runtime;
