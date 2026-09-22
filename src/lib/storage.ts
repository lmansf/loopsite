/**
 * src/lib/storage.ts — the ONLY toucher of localStorage.
 *
 * Spec: design/11-narrative-build-spec.md §C.12. Rewritten by WP-N to
 * `loop:v2`; the public API is unchanged. Owned by WP-B thereafter.
 *
 * One versioned key. Every read and write is try/catch'd; every failure
 * returns the default. If storage is unavailable the site is fully functional
 * and simply forgets between visits — no warning, no degraded UI, no prompt.
 *
 * Never read during render (hydration mismatch): `boot.ts` reads it before
 * first paint, the runtime reads it inside an effect.
 *
 * `loop:v1` (the ring's state) is not migrated. Nothing in it means anything
 * here, and it is left alone rather than deleted: deleting it would be the
 * only destructive thing the site ever did to a reader's browser.
 */

import type { LoopState } from './types.ts';

const KEY = 'loop:v2';
const DEBOUNCE_MS = 500;

/** Caps, so a corrupt or hostile blob can never grow without bound. */
const MAX_KEYS = 96;
const MAX_ACCOUNTS = 24;
const MAX_CONTRADICTIONS = 8;

export const DEFAULT_STATE: LoopState = {
  v: 2,
  keys: [],
  opens: {},
  visited: [],
  visits: {},
  collected: [],
  entry: {},
  belief: 0,
  pass: 0,
  motion: 'auto',
};

let cached: LoopState | null = null;
let pending: Partial<LoopState> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function strArr(x: unknown, max: number): string[] {
  if (!Array.isArray(x)) return [];
  const out: string[] = [];
  for (const s of x) {
    if (typeof s !== 'string' || s.length > 64 || out.includes(s)) continue;
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function numRecord(x: unknown, max: number): Record<string, number> {
  const out: Record<string, number> = {};
  if (!x || typeof x !== 'object') return out;
  let i = 0;
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    if (i++ >= max) break;
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = Math.max(0, Math.floor(v));
  }
  return out;
}

function strRecord(x: unknown, max: number): Record<string, string> {
  const out: Record<string, string> = {};
  if (!x || typeof x !== 'object') return out;
  let i = 0;
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    if (i++ >= max) break;
    if (typeof v === 'string' && v.length <= 32) out[k] = v;
  }
  return out;
}

function sanitize(raw: unknown): LoopState {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_STATE, opens: {}, visits: {}, entry: {} };
  const o = raw as Partial<LoopState>;
  const belief = o.belief === 1 || o.belief === 2 ? o.belief : 0;
  return {
    v: 2,
    keys: strArr(o.keys, MAX_KEYS),
    opens: numRecord(o.opens, MAX_KEYS),
    visited: strArr(o.visited, MAX_ACCOUNTS),
    visits: numRecord(o.visits, MAX_ACCOUNTS),
    collected: strArr(o.collected, MAX_CONTRADICTIONS),
    entry: strRecord(o.entry, MAX_ACCOUNTS),
    belief,
    pass: typeof o.pass === 'number' && Number.isFinite(o.pass) ? Math.max(0, Math.min(3, Math.floor(o.pass))) : 0,
    motion: o.motion === 'reduce' ? 'reduce' : 'auto',
  };
}

export function readState(): LoopState {
  if (cached) return cached;
  let parsed: unknown = null;
  try {
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(KEY);
      if (raw) parsed = JSON.parse(raw);
    }
  } catch {
    parsed = null;
  }
  cached = sanitize(parsed);
  return cached;
}

function flush(): void {
  timer = null;
  const patch = pending;
  pending = null;
  if (!patch) return;
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(KEY, JSON.stringify(readState()));
  } catch {
    /* storage unavailable — the site simply forgets. */
  }
}

/** Merge a patch into state. The write to disk is debounced 500 ms. */
export function writeState(patch: Partial<LoopState>): void {
  const next = { ...readState(), ...patch, v: 2 as const };
  cached = next;
  pending = { ...(pending ?? {}), ...patch };
  if (timer) clearTimeout(timer);
  if (typeof window !== 'undefined') timer = setTimeout(flush, DEBOUNCE_MS);
}

/** Force the debounced write out now (used on pagehide). */
export function flushState(): void {
  if (timer) clearTimeout(timer);
  pending = pending ?? {};
  flush();
}

/** An account was entered. Records first-entry order and the entry count. */
export function markVisited(slug: string): void {
  const s = readState();
  const visited = s.visited.includes(slug) ? s.visited : [...s.visited, slug];
  const visits = { ...s.visits, [slug]: (s.visits[slug] ?? 0) + 1 };
  writeState({ visited, visits });
}

/** A contradiction was earned. Idempotent. */
export function markFound(id: string): void {
  const s = readState();
  if (s.collected.includes(id)) return;
  writeState({ collected: [...s.collected, id] });
}

/** Test-only reset. Not used by the site. */
export function __resetStorageForTest(): void {
  cached = null;
  pending = null;
  if (timer) clearTimeout(timer);
  timer = null;
}
