/**
 * src/lib/ring-geometry.ts — the single source of truth for ring geometry.
 *
 * Spec: design/05-build-spec.md §C.1. FROZEN after WP0.
 *
 * Angles are normalized turns: 0 = 12 o'clock, increasing clockwise.
 *   x = cx + ρ·sin(2πa)
 *   y = cy − ρ·cos(2πa)
 */

import type { RingGeometry } from './types';

export type { RingGeometry };

/**
 * The radius-level mapping: ρ(r) = R · (1 + 0.042·(r − 8)).
 *
 * SPEC NOTE (see design/06-wp0-notes.md, note 1). §D's preamble writes this as
 * `R · (0.58 + 0.042·r)` and in the same breath states "level 8 = exactly R".
 * Those two cannot both be true: 0.58 + 0.042·8 = 0.916. The invariant is the
 * load-bearing half — §C.3 defines the node type as "8 = exactly on the ring",
 * §C.12 makes 8 the default keyboard radius, the sweep head is drawn at level 8,
 * and a tap on the band must resolve to 8 — so the base is shifted to 0.664 and
 * the 0.042 step is kept exactly. Level 0 = 0.664·R, level 15 = 1.294·R, which
 * stays clear of the 1.45·R flick-to-remove threshold.
 */
export const LEVEL_STEP = 0.042;
export const LEVEL_ON_RING = 8;

export function radiusOfLevel(level: number, R: number): number {
  return R * (1 + LEVEL_STEP * (level - LEVEL_ON_RING));
}

/**
 * Ring diameter (as a share of the short axis) and centre height (as a share
 * of the viewport height). Fine pointers: 78 % centred. Touch screens lift the
 * ring so the caption, the Next Arc and two rows of 44–48 px notches stack
 * beneath it without overlap; the two shortest phone classes also give up a
 * little diameter for that room. Mirrored byte-for-byte in hero-bootstrap.ts.
 */
export function ringScale(h: number, coarse: boolean): { d: number; cy: number } {
  if (!coarse) return { d: 0.78, cy: 0.5 };
  if (h < 600) return { d: 0.7, cy: 0.37 };
  if (h < 700) return { d: 0.74, cy: 0.4 };
  return { d: 0.78, cy: 0.42 };
}

export function computeGeometry(w: number, h: number, coarse: boolean): RingGeometry {
  const short = Math.min(w, h);
  const scale = ringScale(h, coarse);
  const D = scale.d * short;
  const R = D / 2;
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  return {
    cx: w / 2,
    cy: scale.cy * h,
    R,
    band: Math.max(28, 0.12 * R),
    dpr,
    w,
    h,
  };
}

/** Screen point -> normalized turn [0,1). */
export function angleAt(x: number, y: number, g: RingGeometry): number {
  const dx = x - g.cx;
  const dy = y - g.cy;
  // atan2(dx, -dy) puts 0 at 12 o'clock and increases clockwise.
  const a = Math.atan2(dx, -dy) / (Math.PI * 2);
  return a < 0 ? a + 1 : a;
}

/** Screen point -> radius level 0..15, clamped. */
export function levelAt(x: number, y: number, g: RingGeometry): number {
  const dx = x - g.cx;
  const dy = y - g.cy;
  const dist = Math.hypot(dx, dy);
  if (g.R <= 0) return 8;
  const level = (dist / g.R - 1) / LEVEL_STEP + LEVEL_ON_RING;
  return Math.max(0, Math.min(15, Math.round(level)));
}

export function pointAt(a: number, level: number, g: RingGeometry): { x: number; y: number } {
  const rho = radiusOfLevel(level, g.R);
  const t = a * Math.PI * 2;
  return { x: g.cx + rho * Math.sin(t), y: g.cy - rho * Math.cos(t) };
}

/** True when a screen point is inside the ring's hit band, R ± band (§C.3). */
export function isOnBand(x: number, y: number, g: RingGeometry): boolean {
  const dist = Math.hypot(x - g.cx, y - g.cy);
  return Math.abs(dist - g.R) <= g.band;
}
