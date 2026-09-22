/**
 * src/sections/loom/logic.ts — the PURE half of LOOM (§D.9).
 *
 * No DOM, no canvas, no React. Everything a reviewer needs to know about what
 * the room *is* lives here, and every magic number is named.
 *
 * The loop is read as a textile: a band tiled at period W = 2πR/3, with 48
 * vertical warp threads per tile (24 on narrow viewports and on the low tier)
 * and 16 weft rows. Each node claims the warp column under its angle and sets a
 * REAL interlacement rule for that column — over/under per row — rather than a
 * texture. The band scrolls exactly one tile per revolution, so it is locked
 * to the clock.
 */

import type { RingNode } from '@/lib/types';

/** Warp threads per tile on a wide viewport at tier high/mid. */
export const WARP = 48;
/** Warp threads per tile on a narrow viewport or at tier low (§D.9 "Mobile"). */
export const WARP_NARROW = 24;
/** Weft rows per tile. */
export const WEFT = 16;
/** Band height as a fraction of R. */
export const BAND_H = 0.5;
export const BAND_H_NARROW = 0.42;
/** Viewports at or below this width use the narrow variant (the shell's own breakpoint). */
export const NARROW_W = 720;
/** A fired node brightens its column for this long. */
export const FIRE_MS = 240;
/** Release springs the weave back over --dur-8 (1200 ms; read from tokens at setup). */
export const SPRING_MS = 1200;
/** Alphas from §D.9: over-threads accent 70%, under-threads accent-2 35%. */
export const OVER_ALPHA = 0.7;
export const UNDER_ALPHA = 0.35;

export function mod1(x: number): number {
  const m = x % 1;
  return m < 0 ? m + 1 : m;
}

/** Tile period: W = 2πR/3. */
export function tilePeriod(R: number): number {
  return (2 * Math.PI * R) / 3;
}

/** Which variant a viewport gets. */
export function warpFor(viewportWidth: number, tier: 'high' | 'mid' | 'low'): number {
  return viewportWidth <= NARROW_W || tier === 'low' ? WARP_NARROW : WARP;
}

export function bandHeightFor(R: number, viewportWidth: number): number {
  return R * (viewportWidth <= NARROW_W ? BAND_H_NARROW : BAND_H);
}

/** The column a node sets: cᵢ = floor(aᵢ · warp). */
export function columnOf(a: number, warp: number): number {
  return Math.min(warp - 1, Math.max(0, Math.floor(mod1(a) * warp)));
}

/**
 * The interlacement rule, verbatim from §D.9:
 *   over when ((y·(1 + (r mod 4)) + c) mod (2 + v mod 3)) === 0, else under.
 */
export function isOver(y: number, c: number, r: number, v: number): boolean {
  return (y * (1 + (r % 4)) + c) % (2 + (v % 3)) === 0;
}

/** Plain tabby for the columns no node has claimed — the ground cloth. */
export function isGroundOver(y: number, c: number): boolean {
  return (y + c) % 2 === 0;
}

/**
 * Fill `owner[c]` with the index of the node ruling column c, or -1.
 * Allocation-free; returns the number of DISTINCT columns set (for depth).
 * A later node in the same column wins, deterministically.
 */
export function assignColumns(
  nodes: readonly RingNode[],
  warp: number,
  owner: Int16Array,
): number {
  owner.fill(-1, 0, warp);
  let set = 0;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (!n) continue;
    const c = columnOf(n.a, warp);
    if (owner[c] === -1) set++;
    owner[c] = i;
  }
  return set;
}

/**
 * Where the first visible tile starts. The band moves one tile per revolution
 * against the sweep direction, so `phase` alone locks it to the clock; `drag`
 * is the visitor's temporary offset (px). Result is in (-W, 0].
 */
export function tileOrigin(phase: number, W: number, drag: number): number {
  if (W <= 0) return 0;
  const x = (-mod1(phase) * W + drag) % W;
  return x > 0 ? x - W : x;
}

/** cubic-bezier(.65,0,.35,1) — the --ease-loop token, evaluated in TS. */
export function easeLoop(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const p1x = 0.65;
  const p2x = 0.35;
  const bez = (a: number, b: number, u: number) => {
    const v = 1 - u;
    return 3 * v * v * u * a + 3 * v * u * u * b + u * u * u;
  };
  let lo = 0;
  let hi = 1;
  let u = t;
  for (let i = 0; i < 20; i++) {
    u = (lo + hi) / 2;
    if (bez(p1x, p2x, u) < t) lo = u;
    else hi = u;
  }
  return bez(0, 1, u);
}

/**
 * Depth (§D.9): 0.25 viewed, 0.5 ≥2 columns set, 0.75 a drag, 1.0 ≥5 columns set.
 * Monotonic in the caller; reported at most once per step.
 */
export function depthFor(columnsSet: number, dragged: boolean): number {
  if (columnsSet >= 5) return 1;
  if (dragged) return 0.75;
  if (columnsSet >= 2) return 0.5;
  return 0.25;
}
