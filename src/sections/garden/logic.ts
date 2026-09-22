/**
 * src/sections/garden/logic.ts — the pure half of GARDEN. No DOM.
 *
 * Spec: design/05-build-spec.md §D.11.
 *
 * The field holds exactly three honest sources: the shipped seed set (150
 * authored share codes, build-time constants), the loops this ring has kept,
 * and any loop opened from a shared URL this session. Plus one Filament ring:
 * your own loop. Nothing here is attributed, counted, or described as
 * anything but what it is — a loop.
 */

import { hashSeed } from '@/lib/rng';
import { decodeLoop } from '@/lib/share';
import type { QualityTier, RingNode } from '@/lib/types';

export type LoopKind = 'own' | 'kept' | 'shared' | 'seed';

export interface FieldLoop {
  /** stable hashing key */
  key: string;
  kind: LoopKind;
  nodes: readonly RingNode[];
  /** mini-ring radius, 24..48 px */
  radius: number;
  /** parallax factor 0..1: far loops are fainter and slower */
  depth: number;
  /** normalized position inside the wrap domain */
  u: number;
  v: number;
  /** drift velocity, px/s */
  vx: number;
  vy: number;
  /** resolved screen position for this frame */
  x: number;
  y: number;
  onScreen: boolean;
}

export const MIN_RADIUS = 24;
export const MAX_RADIUS = 48;
export const MIN_SPEED = 6;
export const MAX_SPEED = 14;
/** the main ring's exclusion zone, in units of R */
export const EXCLUSION = 1.15;
/** the wrap domain extends this far past every edge so loops enter fully formed */
export const MARGIN = 56;
/** every mini-ring is at least this easy to hit (§D.11 mobile) */
export const HIT_MIN = 22;
/** reduced motion: the static jittered grid cell */
export const GRID_CELL = 104;
/** reduced motion: alpha breathes 0.6 <-> 0.85 over 12 s */
export const BREATHE_MS = 12_000;

export function makeLoop(key: string, kind: LoopKind, nodes: readonly RingNode[], seed: number): FieldLoop {
  const h = (k: string) => hashSeed(seed, key + k);
  const depth = h('d');
  const speed = (MIN_SPEED + (MAX_SPEED - MIN_SPEED) * h('s')) * (0.4 + 0.6 * (1 - depth));
  const heading = h('h') * Math.PI * 2;
  return {
    key,
    kind,
    nodes,
    radius: MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * h('r'),
    depth,
    u: h('u'),
    v: h('v'),
    vx: Math.cos(heading) * speed,
    vy: Math.sin(heading) * speed,
    x: 0,
    y: 0,
    onScreen: false,
  };
}

/** Decode a list of share codes into field loops; codes that fail decode are dropped silently. */
export function decodeMany(codes: readonly string[], kind: LoopKind, prefix: string, seed: number): FieldLoop[] {
  const out: FieldLoop[] = [];
  for (let i = 0; i < codes.length; i++) {
    const decoded = decodeLoop(codes[i] ?? '');
    if (!decoded || decoded.nodes.length === 0) continue;
    out.push(makeLoop(`${prefix}${i}`, kind, decoded.nodes, seed));
  }
  return out;
}

/** How many loops are simulated and drawn: virtualized by viewport and tier (§D.11). */
export function visibleCount(tier: QualityTier, w: number, h: number): number {
  const narrow = Math.min(w, h) < 600;
  if (narrow) return tier === 'low' ? 40 : tier === 'mid' ? 70 : 110;
  return tier === 'low' ? 70 : tier === 'mid' ? 110 : 150;
}

/** Advance a loop's normalized position; the domain wraps toroidally. */
export function drift(loop: FieldLoop, dtMs: number, w: number, h: number): void {
  const dw = w + MARGIN * 2;
  const dh = h + MARGIN * 2;
  if (dw <= 0 || dh <= 0) return;
  loop.u = mod1(loop.u + (loop.vx * dtMs) / 1000 / dw);
  loop.v = mod1(loop.v + (loop.vy * dtMs) / 1000 / dh);
}

/**
 * Resolve a loop's screen position from its normalized one, sliding it out of
 * the main ring's exclusion zone if its path runs through the centre.
 */
export function place(loop: FieldLoop, w: number, h: number, cx: number, cy: number, R: number): void {
  let x = -MARGIN + loop.u * (w + MARGIN * 2);
  let y = -MARGIN + loop.v * (h + MARGIN * 2);
  const ex = EXCLUSION * R + loop.radius;
  const dx = x - cx;
  const dy = y - cy;
  const d = Math.hypot(dx, dy);
  if (d < ex) {
    if (d < 1e-6) {
      x = cx + ex;
    } else {
      x = cx + (dx / d) * ex;
      y = cy + (dy / d) * ex;
    }
  }
  loop.x = x;
  loop.y = y;
  const r = loop.radius + 4;
  loop.onScreen = x > -r && x < w + r && y > -r && y < h + r;
}

/**
 * Reduced motion: no drift. Loops sit on a jittered grid that skips the
 * exclusion zone; loops that do not fit are simply not shown this frame.
 */
export function gridLayout(
  loops: readonly FieldLoop[],
  count: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  R: number,
  seed: number,
): void {
  const cols = Math.max(1, Math.floor(w / GRID_CELL));
  const rows = Math.max(1, Math.floor(h / GRID_CELL));
  const ox = (w - cols * GRID_CELL) / 2 + GRID_CELL / 2;
  const oy = (h - rows * GRID_CELL) / 2 + GRID_CELL / 2;
  let i = 0;
  const n = Math.min(count, loops.length);
  for (let row = 0; row < rows && i < n; row++) {
    for (let col = 0; col < cols && i < n; col++) {
      const gx = ox + col * GRID_CELL;
      const gy = oy + row * GRID_CELL;
      if (Math.hypot(gx - cx, gy - cy) < EXCLUSION * R + MAX_RADIUS) continue;
      const loop = loops[i] as FieldLoop;
      const jx = (hashSeed(seed, loop.key + 'gx') - 0.5) * GRID_CELL * 0.4;
      const jy = (hashSeed(seed, loop.key + 'gy') - 0.5) * GRID_CELL * 0.4;
      loop.x = gx + jx;
      loop.y = gy + jy;
      loop.onScreen = true;
      i++;
    }
  }
  for (; i < loops.length; i++) (loops[i] as FieldLoop).onScreen = false;
}

/** The nearest on-screen loop under a point, or -1. Hit targets are >= 44 px across. */
export function hitLoop(loops: readonly FieldLoop[], count: number, x: number, y: number): number {
  let best = -1;
  let bestD = Infinity;
  const n = Math.min(count, loops.length);
  for (let i = 0; i < n; i++) {
    const loop = loops[i] as FieldLoop;
    if (!loop.onScreen) continue;
    const d = Math.hypot(loop.x - x, loop.y - y);
    if (d <= Math.max(HIT_MIN, loop.radius + 6) && d < bestD) {
      best = i;
      bestD = d;
    }
  }
  return best;
}

/** Field alpha: 0.25 + 0.35·(1 − depth); under reduced motion, a 12 s breathe 0.6 <-> 0.85. */
export function alphaFor(loop: FieldLoop, reduced: boolean, t: number, i: number, n: number): number {
  if (!reduced) return 0.25 + 0.35 * (1 - loop.depth);
  const k = 0.5 + 0.5 * Math.sin(Math.PI * 2 * (t / BREATHE_MS + i / Math.max(1, n)));
  return 0.6 + 0.25 * k;
}

/**
 * Depth is the room's honest answer to how much of it was seen (§D.11):
 * 0.25 viewed, 0.5 a preview, 0.75 own loop in the field, 1.0 a loop taken in.
 */
export function depthFor(previewed: boolean, ownSpotted: boolean, adopted: boolean): number {
  if (adopted) return 1;
  if (ownSpotted) return 0.75;
  if (previewed) return 0.5;
  return 0.25;
}

export function mod1(x: number): number {
  const m = x % 1;
  return m < 0 ? m + 1 : m;
}
