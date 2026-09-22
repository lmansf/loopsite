/**
 * src/lib/storage.ts — the ONLY toucher of localStorage.
 *
 * Spec: design/05-build-spec.md §C.8. FROZEN after WP0.
 *
 * One versioned key. Every read and write is try/catch'd; every failure returns
 * the default. If storage is unavailable the site is fully functional and simply
 * forgets between visits — no warning, no degraded UI, no prompt.
 *
 * Never read during render (hydration mismatch): read inside a useEffect.
 */

import type { LoopState } from './types';

const KEY = 'loop:v1';
const DEBOUNCE_MS = 500;

export const DEFAULT_STATE: LoopState = {
  v: 1,
  visited: [],
  visits: {},
  collected: [],
  maxDepth: 0,
  kept: [],
  lastLoop: null,
  returns: 0,
  sound: false,
  motion: 'auto',
  slow: false,
  reverse: false,
};

let cached: LoopState | null = null;
let pending: Partial<LoopState> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function sanitize(raw: unknown): LoopState {
  const d = DEFAULT_STATE;
  if (!raw || typeof raw !== 'object') return { ...d, visits: {} };
  const o = raw as Partial<LoopState>;
  const strArr = (x: unknown, max: number): string[] =>
    Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string').slice(0, max) : [];
  const visits: Record<string, number> = {};
  if (o.visits && typeof o.visits === 'object') {
    for (const [k, val] of Object.entries(o.visits)) {
      if (typeof val === 'number' && Number.isFinite(val)) visits[k] = Math.max(0, Math.floor(val));
    }
  }
  return {
    v: 1,
    visited: strArr(o.visited, 24),
    visits,
    collected: strArr(o.collected, 8),
    maxDepth: typeof o.maxDepth === 'number' ? Math.max(0, Math.min(1, o.maxDepth)) : 0,
    kept: strArr(o.kept, 12),
    lastLoop: typeof o.lastLoop === 'string' ? o.lastLoop : null,
    returns: typeof o.returns === 'number' && Number.isFinite(o.returns) ? Math.floor(o.returns) : 0,
    sound: o.sound === true,
    motion: o.motion === 'reduce' ? 'reduce' : 'auto',
    slow: o.slow === true,
    reverse: o.reverse === true,
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
  const next = { ...readState(), ...patch, v: 1 as const };
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

export function markVisited(slug: string): void {
  const s = readState();
  const visited = s.visited.includes(slug) ? s.visited : [...s.visited, slug];
  const visits = { ...s.visits, [slug]: (s.visits[slug] ?? 0) + 1 };
  writeState({ visited, visits });
}

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
