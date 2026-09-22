/**
 * src/lib/types.ts — THE SHARED CONTRACT.
 *
 * Written by WP0. **Frozen.** A room agent editing this file is the failure
 * mode that costs the swarm a day (spec §G). If you need a change here, open
 * an issue; the architect makes the change.
 *
 * Source of truth: design/05-build-spec.md §C.3, §C.4, §F.3.
 */

/** A room slug, branded so a stray string cannot be passed where a room is expected. */
import type * as React from 'react';

export type SectionId = string & { readonly __brand: 'SectionId' };

/** Narrow a plain string to a SectionId. The only sanctioned way to make one. */
export const asSectionId = (s: string): SectionId => s as SectionId;

/* ------------------------------------------------------------------ nodes */

/**
 * A node is the only thing a visitor creates (§C.3).
 * Angles are normalized turns: 0 = 12 o'clock, increasing clockwise.
 */
export interface RingNode {
  /** crypto.randomUUID().slice(0,8) */
  id: string;
  /** angle, normalized turn [0,1), quantized to 1/256 on commit */
  a: number;
  /** radius level 0..15 (8 = exactly on the ring) */
  r: number;
  /** variant 0..15 — room-interpreted (timbre, hue index, thread) */
  v: number;
  /** clock.revolution at creation, for age-based effects (WEAR) */
  born: number;
}

/** A node crossed by the sweep on this frame. `lateness` is in milliseconds. */
export interface FireEvent {
  node: RingNode;
  lateness: number;
}

/* ------------------------------------------------------------------ clock */

export type QualityTier = 'high' | 'mid' | 'low';

/** The read-only per-frame snapshot every room receives (§C.4). */
export interface ClockFrame {
  /** ms since the clock started, monotonic */
  t: number;
  /** ms since the previous frame, clamped to 50 */
  dt: number;
  /** [0,1). Quantized to 12 steps on read under reduced motion. */
  phase: number;
  /** integer; increments on each forward wrap, decrements on each backward wrap, never below 0 */
  revolution: number;
  dir: 1 | -1;
  /** 4000 normally, up to 16000 in SLOW */
  periodMs: number;
  /** true on the single frame where revolution % 6 === 0 — the 24 s Return */
  isReturn: boolean;
  tier: QualityTier;
}

/* ------------------------------------------------------------------ geometry */

export interface RingGeometry {
  cx: number;
  cy: number;
  R: number;
  band: number;
  dpr: number;
  w: number;
  h: number;
}

/* ------------------------------------------------------------------ storage */

export interface LoopState {
  v: 1;
  /** slugs, in first-visit order */
  visited: string[];
  /** slug -> visit count (drives the `144` hidden destination) */
  visits: Record<string, number>;
  /** hidden ids found: silence|reverse|144|twin|slow */
  collected: string[];
  /** 0..1, max depth reported by any room */
  maxDepth: number;
  /** up to 12 share codes the visitor saved */
  kept: string[];
  /** share code of the ring at last unload */
  lastLoop: string | null;
  /** number of times RETURN has been reached */
  returns: number;
  sound: boolean;
  /** explicit override; default 'auto' */
  motion: 'auto' | 'reduce';
  slow: boolean;
  reverse: boolean;
}

/* ------------------------------------------------------------------ explore */

export type ExploreEventName =
  | 'section_viewed'
  | 'section_interacted'
  | 'depth_reached'
  | 'collectible_found'
  | 'section_completed';

export interface ExploreEvent {
  name: ExploreEventName;
  section: SectionId;
  /** 0..1, monotonic */
  depth?: number;
  /** non-PII, max 8 keys */
  detail?: Record<string, string | number | boolean>;
}

/** The five events that reach the wire (§C.9). */
export type BeaconEventName =
  | 'session_start'
  | 'hero_interacted'
  | 'section_viewed'
  | 'depth_reached'
  | 'time_on_site_30s';

/* ------------------------------------------------------------------ sections */

/**
 * Every room component receives exactly this.
 *
 * IMPORTANT: this object is **stable across frames**. The shell mutates
 * `clock`, `fired`, `nodes` and `geometry` on it in place each frame, and only
 * re-renders the component when `active`, `visible`, `reducedMotion`, `seed`
 * or `tier` change. That is what keeps React out of the 60 fps path. Read them
 * inside your `draw()` — never destructure them at effect-setup time.
 */
export interface SectionProps {
  id: SectionId;
  /** this is the ?s= selected room */
  active: boolean;
  /** >20% visible. Rooms MUST NOT draw when false. */
  visible: boolean;
  /** resolved once in the shell; rooms never call matchMedia */
  reducedMotion: boolean;
  /** from ?seed=; same seed => same visuals */
  seed: number;
  onExplore: (event: ExploreEvent) => void;

  /** read-only snapshot for the current frame */
  clock: ClockFrame;
  /** read-only. Rooms never mutate the set. */
  nodes: readonly RingNode[];
  geometry: RingGeometry;
  /** nodes that fired this frame */
  fired: readonly FireEvent[];
  /** the ROOM layer */
  ctx: CanvasRenderingContext2D | null;
  /** the BACKGROUND layer */
  bg: CanvasRenderingContext2D | null;
  tier: QualityTier;
  /** caption slot; only §I strings are legal */
  say: (text: string, ms?: number) => void;
}

export interface SectionModule {
  id: SectionId;
  /** the one-word label: nav, <h2>, Ringway */
  title: string;
  /** the one-line hook copy (§I.3) */
  hook: string;
  /** one sentence for generateMetadata on /s/[slug] */
  blurb: string;
  /** the Next Arc destination */
  next: SectionId;
  /** 1..12, or null for hidden destinations */
  notch: number | null;
  kind: 'core' | 'expansion' | 'hidden';
  /**
   * The server-rendered shell is NOT carried here: registry consumers are client
   * modules, and a Shell on the module would ship all seventeen shells to the
   * browser. Server code resolves it through `src/sections/shells.tsx`.
   */
  Shell?: React.ComponentType<{ children?: React.ReactNode }>;
  load: () => Promise<{ default: React.ComponentType<SectionProps> }>;
  /** '100dvh' */
  reservedHeight: string;
  /** CI asserts the gz chunk size */
  budgetKb: number;
  /** caps DPR at 1.5 (MIRROR, TRAIL) */
  heavy?: boolean;
}
