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
 *  - `data-held` on the pressable words themselves, from stored keys, so the
 *    solid rule of §C.2 is permanent across sessions and not just within one;
 *  - the night's `data-state` and `data-more` attributes, `aria-current`, the
 *    hub and the live region;
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
 * Not here, and deliberately left to their owners: the ambient figure's idle
 * mount (WP-C), the share merge and the `someone read it this way` caption
 * (WP-D).
 *
 * A contradiction has no authored effect to trigger: `Contradiction.line` is
 * prose, and prose may not reach this module (§E item 3). What a landing
 * contradiction gets is the hub — the numeral, one Ember pulse, and the same
 * numeral in the live region so the tick is not a visual-only event.
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { AccountId, Belief, KeyId } from '@/content/schema';
import { ACCOUNT_IDS } from '@/content/schema';
import {
  ACCOUNTS,
  CONTRADICTIONS,
  accountHasMore,
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
import type { AccountState, Knowledge } from '@/lib/types';

const ACCOUNT_SET = new Set<string>(ACCOUNT_IDS);
const VIEWED_MS = 1000;
/** one Ember pulse on the hub when a contradiction lands (§C.3, §C.16). */
const PULSE_MS = 320;

/** `switch — it says more now`, the §C.13 string, joined for one announcement. */
function announce(text: string): void {
  const el = document.getElementById('loop-live');
  if (el) el.textContent = text;
}

function titleOf(slug: string): string {
  const el = document.querySelector(`#section-${CSS.escape(slug)} > h2`);
  return el?.textContent?.trim() ?? slug;
}

/**
 * The suffix a slot says in the accessibility tree — all three of them are
 * §C.13 strings and no other word may be used.
 *
 *   read             the reader has been here and it says what it said
 *   it says more now the reader has been here and it has since gained a block
 *   changed          the reader has NEVER been here and it has gained a block
 *
 * The third is the first-time reader's case (§A.2). `changed` is the honest
 * word for it: something happened to that account, and unlike `read` and
 * `it says more now` it claims nothing about what the reader has done or
 * heard. A slot that is merely unread still says only its title.
 */
function slotName(title: string, state: AccountState, more: boolean): string {
  if (state === 'changed') return `${title} — it says more now`;
  if (state === 'read') return `${title} — read`;
  if (more) return `${title} — changed`;
  return title;
}

/**
 * The night, the hub and the ask bar, repainted from a knowledge snapshot.
 *
 * Two attributes, because they answer two different questions and the second
 * one is true of accounts the first one cannot describe (§C.7, and
 * `accountHasMore` in `@/lib/knowledge`):
 *
 *   data-state  unread | read | changed — where the READER has been
 *   data-more   present iff this account holds a block the reader has unlocked
 *               and not yet seen, whether or not they have ever opened it
 *
 * `changed` implies `data-more`, so the bar `night.css` draws is the same
 * bar, on whichever mark the slot already has: hollow-plus-bar is the
 * unvisited case, filled-plus-bar the visited one — a fourth shape, and no
 * new colour. Nothing moves: the bar is absolutely positioned into headroom
 * the slot already reserves above its mark, so it appears without costing a
 * pixel of layout, which is why this is safe to do live (§C.3, §E CLS 0).
 */
function paintNight(k: Knowledge, active: string): void {
  for (const slot of document.querySelectorAll<HTMLAnchorElement>('.night > a')) {
    const slug = slot.dataset.slug;
    if (!slug || !ACCOUNT_SET.has(slug)) continue;
    const state = accountState(slug as AccountId, k);
    const more = accountHasMore(slug as AccountId, k);
    if (slot.dataset.state !== state) slot.dataset.state = state;
    if (more) {
      if (slot.dataset.more !== 'true') slot.dataset.more = 'true';
    } else if ('more' in slot.dataset) {
      delete slot.dataset.more;
    }
    if (slug === active) slot.setAttribute('aria-current', 'page');
    else slot.removeAttribute('aria-current');
    const sr = slot.querySelector('[data-slot-state]');
    if (sr) {
      const title = slot.querySelector('.label')?.textContent ?? slug;
      const name = slotName(title, state, more);
      if (sr.textContent !== name) sr.textContent = name;
    }
  }
}

/**
 * The hub (§C.7, §C.8). `n/5` is the only numeral the UI may print and `0` is
 * not one of them, so it prints nothing at zero; the box is reserved either
 * way, so the tick to `1/5` shifts nothing.
 *
 * `pulse` is the single 320 ms Ember pulse a landing contradiction earns
 * (§C.3.4). It is an attribute, so the animation is WP-C's to draw, and it is
 * never set under reduced motion, where the numeral simply changes (§C.16).
 */
function paintHub(k: Knowledge, pulse: boolean): void {
  const n = k.contradictions.size;
  const text = n > 0 ? `${n}/${CONTRADICTIONS.length}` : '';
  const still = document.documentElement.dataset.motion === 'reduce';
  for (const hub of document.querySelectorAll<HTMLElement>('.hub')) {
    hub.dataset.found = String(n);
    if (hub.textContent !== text) hub.textContent = text;
    if (!pulse || still) continue;
    hub.dataset.pulse = 'true';
    window.setTimeout(() => {
      delete hub.dataset.pulse;
    }, PULSE_MS);
  }
}

/**
 * The belief (§C.9). One attribute on `<html>` swaps every authored variant
 * in the document at once — no network, no remount, nothing to re-render —
 * and the two options say which one is held by **shape and by semantics**: a
 * filled pip and `aria-current`, never colour alone (§F.4).
 *
 * Both options stay on screen and stay enabled, so the choice is reversible
 * in one tap; each one pushes, so Back reverses it too.
 */
function paintBelief(value: Belief | null): void {
  document.documentElement.dataset.belief = value ?? 'none';
  for (const option of document.querySelectorAll<HTMLElement>('[data-belief-option]')) {
    const held = option.dataset.beliefOption === value;
    if (held) option.setAttribute('aria-current', 'true');
    else option.removeAttribute('aria-current');
    option.querySelector('.pip > circle')?.setAttribute('fill', held ? 'currentColor' : 'none');
  }
}

/**
 * A blank rule in `four seconds` (§C.10) is the real sentence with the colour
 * taken out of it, so its width, its wrapping and its line count are exact.
 * The sentence is not earned yet, so it must not be read out either — but the
 * `see also` link beside it is a real control and must stay reachable and
 * must still be announced.
 *
 * So the prose is wrapped in one `aria-hidden` span and the invisible words
 * inside it are taken out of the tab order, and the link is left exactly
 * where the server put it. The span is inline and carries no style of its
 * own, so it fragments nothing and moves nothing; `veiled` is idempotent and
 * `unveil` puts every node back the moment the sentence is earned.
 *
 * (`aria-hidden` on the block itself — the literal reading of §C.10 — hides
 * the link as well, and axe is right to call a focusable element inside an
 * `aria-hidden` subtree a serious defect. Measured: seven of them.)
 */
function veil(el: HTMLElement): void {
  if (el.dataset.veiled === 'true') return;
  const keep = el.querySelector('.see-also');
  const span = document.createElement('span');
  span.setAttribute('aria-hidden', 'true');
  span.dataset.veil = '';
  while (el.firstChild && el.firstChild !== keep) span.appendChild(el.firstChild);
  if (keep) el.insertBefore(span, keep);
  else el.appendChild(span);
  for (const summary of span.querySelectorAll('summary')) summary.tabIndex = -1;
  el.dataset.veiled = 'true';
}

function unveil(el: HTMLElement): void {
  if (el.dataset.veiled !== 'true') return;
  const span = el.querySelector<HTMLElement>('[data-veil]');
  if (span) {
    for (const summary of span.querySelectorAll('summary')) summary.removeAttribute('tabindex');
    while (span.firstChild) el.insertBefore(span.firstChild, span);
    span.remove();
  }
  delete el.dataset.veiled;
}

/**
 * The solid rule under every word the reader has ever opened (§C.2, §C.8).
 *
 * `data-held` used to be written only inside `onToggle`, so a key earned in an
 * earlier session came back as an unpressed word: the one progress set the
 * spec calls permanent — *the page literally gets more solid as the reader
 * works* — reset on every reload. It is painted here from stored state
 * instead, for the whole document rather than one account, because a word is
 * held wherever it appears and this costs one pass over 43 elements.
 *
 * Before first paint the same rule is drawn by `boot.ts`, which emits a
 * `text-decoration-style: solid` rule per held key into `#loop-keys` — the
 * reader with stored keys sees their words solid in the FIRST painted frame,
 * with nothing but the inline bootstrap. This pass makes the attribute true
 * as well, which is what lets the entry effect drop `#loop-keys` without
 * anything changing on screen.
 *
 * It touches `details.aside`, never `.blk`, so it materialises nothing and
 * moves nothing: `text-decoration-style` is not a layout property.
 */
function paintHeld(k: Knowledge): void {
  for (const el of document.querySelectorAll<HTMLElement>('details.aside[data-key]')) {
    const key = el.dataset.key;
    if (!key) continue;
    if (k.keys.has(key)) {
      if (el.dataset.held !== 'true') el.dataset.held = 'true';
    } else if ('held' in el.dataset) {
      delete el.dataset.held;
    }
  }
}

/**
 * §C.4: *the one aside carrying `open: true` is granted at boot, in the
 * account that owns it, on first arrival.* It was not, so the endowment §C.8
 * calls genuine — "one of ~forty words held before the reader has done
 * anything" — was false, and the one worked example on the first screen
 * rendered solid while being unheld, teaching the wrong mapping.
 *
 * It is read off the document rather than named here, because the corpus does
 * not reach this module (§E item 3) and the word that arrives open is the
 * writer's choice, not the engine's. It is granted only in the account being
 * entered, so a reader who deep-links into `road` is not handed a key from an
 * account they have not opened; they get it when they arrive at the account
 * that carries it. Idempotent, so entering twice grants once.
 *
 * Safe to call before `markEntered`, and it must be: the mask then records it
 * and the account does not falsely read `changed` at its own first entry.
 * Nothing materialises from it either, because `auditCorpus` (§C.4, law 4)
 * forbids any account to lock a block behind a key it emits itself.
 */
function grantEndowedKey(slug: string): void {
  const open = document.querySelector<HTMLElement>(
    `#section-${CSS.escape(slug)} details.aside[open][data-key]`,
  );
  const key = open?.dataset.key;
  if (key) grantKey(key);
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
      if (blank) unveil(el);
    } else {
      delete el.dataset.held;
      delete el.dataset.new;
      // In `four seconds` a locked block is a blank rule of exactly its own
      // width — the real sentence, made transparent. It must not be read out.
      if (blank) veil(el);
    }
  }
}

export function Runtime() {
  const { section, belief, setSection, setBelief: setUrlBelief } = useUrlState();
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

    // The word that arrives already open is a key the reader holds, from the
    // first frame they hold anything (§C.4). Before `markEntered`, so this
    // account's own mask records it.
    grantEndowedKey(slug);

    // The mask recorded at this account's LAST entry, read BEFORE markEntered
    // rewrites it. The difference is what gets `data-new` for one entry.
    const previous = new Set<KeyId>(readKnowledge().entry[slug] ?? []);
    markEntered(slug as AccountId);
    const k = readKnowledge();

    materialise(slug, k, previous);
    // Every word the reader has ever opened, solid again — the same rule
    // `#loop-keys` is already drawing, now as an attribute, in this paint.
    paintHeld(k);
    document.documentElement.dataset.s = slug;
    paintNight(k, slug);
    paintHub(k, false);
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
    // `?b=` wins over storage, which is how an inbound link hands its reading
    // over; with no `?b=` the stored belief is what the reader chose last.
    const value: Belief | null = belief ?? stored;
    if (belief && belief !== stored) setBelief(belief);
    paintBelief(value);
  }, [belief]);

  /* ---- the three delegated listeners, and the beacon ---- */
  useEffect(() => {
    initBeacon();

    const unsubscribe = subscribe((k) => {
      paintNight(k, entered.current ?? '');
      paintHub(k, false);
    });

    /** A `<details>` opening is the only way a key is ever granted (§C.3). */
    function onToggle(event: Event): void {
      const el = event.target as HTMLElement | null;
      if (!(el instanceof HTMLDetailsElement) || !el.classList.contains('aside')) return;
      const key = el.dataset.key;
      if (!key || !el.open) return;
      // The rule under the word goes solid here and stays solid for the rest
      // of the reader's life with the site, open or closed (§C.2).
      el.dataset.held = 'true';
      // What the night said one instant before the press, so the reaction can
      // be the DIFFERENCE and never the whole standing state.
      const before = readKnowledge();
      noteOpen(key);
      const delta = grantKey(key);
      const k = readKnowledge();
      // Nothing in THIS account moves. What moves is the night and the hub —
      // feedback visibly larger than the target, in the same frame (§C.3).
      paintNight(k, entered.current ?? '');
      paintHub(k, delta.contradictions.length > 0);
      beacon('word_pressed', { account: entered.current ?? '' });
      if (delta.contradictions.length > 0) {
        beacon('contradiction_found', { id: delta.contradictions[0] as string, n: k.contradictions.size });
      }
      // One announcement for the whole tick (§C.3.3): the accounts that now
      // say more, and — because the Ember tick is otherwise seen and not
      // heard — the hub's own `n/5`, which is a §C.13 string.
      //
      // Every account whose answer to "has it got something for you" changed
      // in this press, not only the visited ones. On a cold profile the
      // reader has visited exactly one account, so the visited-only version
      // of this list was empty and the first press of the first word — the
      // ten seconds the whole build is priced on (§A.2) — said and showed
      // nothing anywhere. Each one is named with the §C.13 string that is
      // true of it: `it says more now` where the reader has been, `changed`
      // where they have not.
      const said: string[] = [];
      for (const id of ACCOUNT_IDS) {
        if (!accountHasMore(id, k) || accountHasMore(id, before)) continue;
        said.push(slotName(titleOf(id), accountState(id, k), true));
      }
      if (delta.contradictions.length > 0) {
        said.push(`${k.contradictions.size}/${CONTRADICTIONS.length}`);
      }
      if (said.length > 0) announce(said.join(', '));
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

      // A belief option (§C.9). It is stored, mirrored onto <html> in the same
      // frame, and pushed, so the other option — which is still on screen and
      // still enabled — reverses it in one tap, and so does Back.
      const b = url.searchParams.get('b');
      if (b === 'valley' || b === 'hill') {
        setBelief(b);
        paintBelief(b);
        if (slug === entered.current) {
          setUrlBelief(b, 'push');
        } else {
          deliberate.current = true;
          setSection(slug, 'push');
          setUrlBelief(b, 'replace');
        }
        return;
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

    // A key is never lost. `pagehide` is the reliable one; `visibilitychange`
    // catches the phone that is swiped away and never fires it.
    function onPageHide(): void {
      flushState();
    }
    function onVisibility(): void {
      if (document.visibilityState === 'hidden') flushState();
    }

    document.addEventListener('toggle', onToggle, { capture: true, passive: true });
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      unsubscribe();
      document.removeEventListener('toggle', onToggle, { capture: true });
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [setSection, setUrlBelief]);

  return null;
}

export default Runtime;
