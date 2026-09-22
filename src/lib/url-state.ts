'use client';

/**
 * src/lib/url-state.ts — the ONLY toucher of `location` and `history`.
 *
 * Spec: design/11-narrative-build-spec.md §C.11. Retained from WP0; only the
 * names it reads changed. FROZEN.
 *
 * The account lives in the search param (`?s=<slug>`), the belief beside it
 * (`?b=valley|hill`), and a shared state in the hash (`#n=<base64url>`).
 * Passive changes use replaceState, deliberate ones use pushState — so Back
 * always leaves in one press from wherever the reader deliberately went.
 */

import { useCallback, useSyncExternalStore } from 'react';

export const DEFAULT_SECTION = 'dog';

interface UrlSnapshot {
  section: string;
  belief: 'valley' | 'hill' | null;
  code: string | null;
}

const EMPTY: UrlSnapshot = { section: DEFAULT_SECTION, belief: null, code: null };

let snapshot: UrlSnapshot = EMPTY;
let listeners: Array<() => void> = [];
let wired = false;

function read(): UrlSnapshot {
  if (typeof window === 'undefined') return EMPTY;
  const params = new URLSearchParams(window.location.search);
  let section = params.get('s');
  const hash = window.location.hash;

  // `#section-<slug>` stays valid for the no-JS document and is honoured on load.
  if (!section && hash.startsWith('#section-')) section = hash.slice('#section-'.length);

  const b = params.get('b');
  return {
    section: section && /^[a-z0-9-]{1,24}$/i.test(section) ? section : DEFAULT_SECTION,
    belief: b === 'valley' || b === 'hill' ? b : null,
    code: hash.startsWith('#n=') ? hash.slice(3) : null,
  };
}

function refresh(): void {
  const next = read();
  if (
    next.section === snapshot.section &&
    next.belief === snapshot.belief &&
    next.code === snapshot.code
  ) {
    return;
  }
  snapshot = next;
  for (const l of listeners) l();
}

function wire(): void {
  if (wired || typeof window === 'undefined') return;
  wired = true;
  snapshot = read();
  window.addEventListener('popstate', refresh);
  window.addEventListener('hashchange', refresh);
}

function subscribe(listener: () => void): () => void {
  wire();
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

const getSnapshot = (): UrlSnapshot => snapshot;
const getServerSnapshot = (): UrlSnapshot => EMPTY;

function writeUrl(
  section: string,
  mode: 'push' | 'replace',
  belief?: 'valley' | 'hill' | null,
): void {
  const params = new URLSearchParams(window.location.search);
  params.set('s', section);
  if (belief === null) params.delete('b');
  else if (belief) params.set('b', belief);
  const url = `${window.location.pathname}?${params.toString()}`;
  if (mode === 'push') window.history.pushState(null, '', url);
  else window.history.replaceState(null, '', url);
  refresh();
}

/**
 * Read and write the URL. `mode` is the back-button contract (§C.11):
 *   'push'    — a deliberate act (a night slot, the ask control or card, an
 *               arrow or digit key, a belief choice)
 *   'replace' — a passive change (anchor normalisation, the alias redirect,
 *               restoring from storage)
 */
export function useUrlState(): {
  section: string;
  belief: 'valley' | 'hill' | null;
  code: string | null;
  setSection(slug: string, mode: 'push' | 'replace'): void;
  setBelief(belief: 'valley' | 'hill' | null, mode: 'push' | 'replace'): void;
  clearCode(): void;
} {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setSection = useCallback((slug: string, mode: 'push' | 'replace') => {
    if (typeof window === 'undefined') return;
    writeUrl(slug, mode);
  }, []);

  const setBelief = useCallback(
    (belief: 'valley' | 'hill' | null, mode: 'push' | 'replace') => {
      if (typeof window === 'undefined') return;
      writeUrl(read().section, mode, belief);
    },
    [],
  );

  // The hash is never written by the site, only read off an inbound link; it
  // is dropped once merged so Back is never polluted (§C.11).
  const clearCode = useCallback(() => {
    if (typeof window === 'undefined') return;
    writeUrl(read().section, 'replace');
  }, []);

  return { ...state, setSection, setBelief, clearCode };
}

/** Read the URL once, outside React (used by the shell before first frame). */
export function readUrlState(): UrlSnapshot {
  return read();
}

/**
 * Normalize `#section-<slug>` to `?s=<slug>` on arrival. Called once by the
 * shell; a passive change, so it always replaces (§C.10).
 */
export function normalizeAnchorUrl(): void {
  if (typeof window === 'undefined') return;
  if (!window.location.hash.startsWith('#section-')) return;
  const slug = window.location.hash.slice('#section-'.length);
  if (!/^[a-z0-9-]{1,24}$/i.test(slug)) return;
  writeUrl(slug, 'replace');
}
