/**
 * src/lib/types.ts — THE SHARED CONTRACT.
 *
 * Rewritten by WP-N under the explicit authorisation in
 * design/11-narrative-build-spec.md §I.14, then **FROZEN** again. Every type
 * the four builders code against lives here and nowhere else. A change here
 * costs four agents; open an issue instead.
 *
 * Source of truth: `design/11-narrative-build-spec.md` §C.12 (storage),
 * §C.14 (beacon), §D.2 (module APIs), §D.4 (the clock).
 *
 * This file imports **types only** from the content contract, so it is erased
 * at compile time and carries no corpus bytes into any bundle (§E, item 3).
 */

import type { AccountId, Belief, KeyId } from '../content/schema.ts';

/* ------------------------------------------------------------------ storage */

/**
 * The one persisted object, `loop:v2` (§C.12). Written only by
 * `src/lib/storage.ts`, read before first paint by `src/lib/boot.ts`.
 */
export interface LoopState {
  v: 2;
  /** real aside ids, in grant order, max 96 */
  keys: string[];
  /** aside id -> number of times opened, max 96 entries (drives `thrice:<key>`) */
  opens: Record<string, number>;
  /** account ids, in first-entry order */
  visited: string[];
  /** account id -> entry count */
  visits: Record<string, number>;
  /** contradiction ids earned */
  collected: string[];
  /** account id -> base64url aside bitfield held at that account's LAST entry */
  entry: Record<string, string>;
  /** 0 none, 1 valley, 2 hill */
  belief: 0 | 1 | 2;
  /** full passes, capped at 3 */
  pass: number;
  /** explicit override; default 'auto' */
  motion: 'auto' | 'reduce';
}

/* ------------------------------------------------------------------- beacon */

/** The five events that reach the wire (§C.14). */
export type BeaconEventName =
  | 'session_start'
  | 'word_pressed'
  | 'account_viewed'
  | 'contradiction_found'
  | 'time_on_site_30s';

/* -------------------------------------------------------------- the night */

/**
 * A night slot's state (§C.7). Never encoded by colour alone: `unread` is a
 * hollow mark, `read` adds a fill and an inner hairline, `changed` adds a
 * second short bar above the mark.
 */
export type AccountState = 'unread' | 'read' | 'changed';

/* --------------------------------------------------------------- knowledge */

/**
 * Everything the reader holds. Immutable; `readKnowledge()` returns a new
 * object on every change and `subscribe()` hands it to the runtime.
 */
export interface Knowledge {
  /** REAL keys only — aside ids the reader has opened. */
  keys: ReadonlySet<KeyId>;
  /** real + synthetic (§C.5). The set every lock is evaluated against. */
  effective: ReadonlySet<KeyId>;
  opens: Readonly<Record<KeyId, number>>;
  visited: ReadonlySet<AccountId>;
  contradictions: ReadonlySet<string>;
  belief: Belief | null;
  /** 0..3 */
  pass: number;
  /** account id -> the key set recorded at that account's LAST entry (§C.6) */
  entry: Readonly<Record<string, ReadonlySet<KeyId>>>;
}

/** What one `grantKey()` changed. Returned so the runtime can paint it. */
export interface KeyDelta {
  key: KeyId;
  /** accounts whose state moved to `changed` because of this grant */
  changed: AccountId[];
  /** contradictions earned in the same tick */
  contradictions: string[];
}

/* ------------------------------------------------------------------- clock */

export type QualityTier = 'high' | 'mid' | 'low';

/**
 * The read-only per-frame snapshot (§D.4). Retained from WP0 unchanged:
 * `src/lib/clock.ts` still owns the single `requestAnimationFrame` in the
 * application, and now only `<Ambient>` ever starts it.
 */
export interface ClockFrame {
  /** ms since the clock started, monotonic */
  t: number;
  /** ms since the previous frame, clamped to 50 */
  dt: number;
  /** [0,1). Quantized to 12 steps on read under reduced motion. */
  phase: number;
  /** integer; increments on each forward wrap, never below 0 */
  revolution: number;
  dir: 1 | -1;
  /** 4000 — the four seconds */
  periodMs: number;
  /** true on the single frame where revolution % 6 === 0 — the 24 s return */
  isReturn: boolean;
  tier: QualityTier;
}

/* ------------------------------------------------------------------ canvas */

/**
 * The ambient canvas's box, in CSS pixels, plus the DPR its backing store was
 * sized at. `src/figures/*.ts` draw in CSS pixels; the context is already
 * transformed.
 */
export interface CanvasGeometry {
  w: number;
  h: number;
  dpr: number;
}
