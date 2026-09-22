'use client';

/**
 * src/lib/url-state.ts — the ONLY toucher of `location` and `history`.
 *
 * Spec: design/05-build-spec.md §C.10. FROZEN after WP0.
 *
 * Room lives in the search param (`?s=<slug>`); the loop lives in the hash
 * (`#l=<base64url>`). Passive changes use replaceState, deliberate ones use
 * pushState — so Back always leaves in one press from wherever the visitor
 * deliberately went.
 */

import { useCallback, useSyncExternalStore } from 'react';

export const DEFAULT_SECTION = 'origin';

interface UrlSnapshot {
  section: string;
  seed: number;
  loopCode: string | null;
}

let snapshot: UrlSnapshot = { section: DEFAULT_SECTION, seed: 0, loopCode: null };
let listeners: Array<() => void> = [];
let wired = false;

function parseSeed(raw: string | null): number {
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n >>> 0 : 0;
}

function read(): UrlSnapshot {
  if (typeof window === 'undefined') return { section: DEFAULT_SECTION, seed: 0, loopCode: null };
  const params = new URLSearchParams(window.location.search);
  let section = params.get('s');
  const hash = window.location.hash;

  // `#section-<slug>` stays valid for the no-JS document and is honoured on load.
  if (!section && hash.startsWith('#section-')) section = hash.slice('#section-'.length);

  const loopCode = hash.startsWith('#l=') ? hash.slice(3) : null;
  return {
    section: section && /^[a-z0-9-]{1,24}$/i.test(section) ? section : DEFAULT_SECTION,
    seed: parseSeed(params.get('seed')),
    loopCode,
  };
}

function refresh(): void {
  const next = read();
  if (
    next.section === snapshot.section &&
    next.seed === snapshot.seed &&
    next.loopCode === snapshot.loopCode
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
const SERVER_SNAPSHOT: UrlSnapshot = { section: DEFAULT_SECTION, seed: 0, loopCode: null };
const getServerSnapshot = (): UrlSnapshot => SERVER_SNAPSHOT;

function writeUrl(section: string, mode: 'push' | 'replace', keepHash: boolean): void {
  const params = new URLSearchParams(window.location.search);
  params.set('s', section);
  const hash = keepHash && window.location.hash.startsWith('#l=') ? window.location.hash : '';
  const url = `${window.location.pathname}?${params.toString()}${hash}`;
  if (mode === 'push') window.history.pushState(null, '', url);
  else window.history.replaceState(null, '', url);
  refresh();
}

/**
 * Read and write the URL. `mode` is the back-button contract:
 *   'push'    — a deliberate act (Ringway click, Next Arc, arrow key, swipe)
 *   'replace' — a passive change (restoring from storage, a completed trick)
 */
export function useUrlState(): {
  section: string;
  seed: number;
  loopCode: string | null;
  setSection(slug: string, mode: 'push' | 'replace'): void;
  setLoopCode(code: string | null): void;
} {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setSection = useCallback((slug: string, mode: 'push' | 'replace') => {
    if (typeof window === 'undefined') return;
    writeUrl(slug, mode, true);
  }, []);

  const setLoopCode = useCallback((code: string | null) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const base = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', code ? `${base}#l=${code}` : base);
    refresh();
  }, []);

  return { ...state, setSection, setLoopCode };
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
  writeUrl(slug, 'replace', false);
}
