/**
 * src/sections/growth/logic.ts — the pure half of GROWTH (§D.7).
 *
 * An L-system fern whose branching rule is the visitor's node pattern.
 *
 *   axiom  F
 *   rule   F → F[+F]F[−F]F
 *
 * Nodes are sorted by angle. Nesting depth `d` of a branch takes its turning
 * angle θ and its length ratio λ from node `d mod n`:
 *
 *   θᵢ = 14° + 22°·(rᵢ/15)        λᵢ = 0.52 + 0.24·(vᵢ/15)
 *
 * The expansion is planned level by level against a hard segment cap. When a
 * level cannot be expanded in full, the F symbols that do expand are chosen by
 * an even (Bresenham) spread over traversal order, so the detail is spent
 * across the whole fern rather than on its first branch. The total is never
 * above the cap for any node arrangement, any generation, any tier.
 *
 * No DOM here: the builder writes segments into typed arrays; Room.tsx turns
 * them into one cached Path2D per nesting depth per generation.
 */

import type { QualityTier, RingNode } from '@/lib/types';

/** Generations cap at 7 (tier low: 5). */
export const GEN_CAP = 7;
export const GEN_CAP_LOW = 5;
/** Total segments per build, hard (§D.7 mobile note). */
export const SEGMENT_CAP = 6000;
export const SEGMENT_CAP_LOW = 2500;
/** A node fire lights the branches at its own depth for this long. */
export const LIT_MS = 240;
/** Cross-fade between two generations. */
export const GEN_FADE_MS = 520;
/** Reduced motion: the finished fern fades in once. */
export const REDUCED_FADE_MS = 160;

const DEG = Math.PI / 180;
const THETA_BASE = 14 * DEG;
const THETA_SPAN = 22 * DEG;
const LAMBDA_BASE = 0.52;
const LAMBDA_SPAN = 0.24;

/** With no nodes the fern grows from a level-8, variant-8 default. */
const DEFAULT_LEVEL = 8;
const DEFAULT_VARIANT = 8;

/** The trunk bends toward "up" by at most this much over its length (rad). */
const TROPISM_MAX = 0.6;
/** Per-segment heading jitter (rad), seeded — the fern is never a diagram. */
const JITTER = 0.05;
/** The `−` branch is a touch tighter than the `+` branch: ferns are not symmetric. */
const MINUS_RATIO = 0.86;

export function genCapFor(tier: QualityTier): number {
  return tier === 'low' ? GEN_CAP_LOW : GEN_CAP;
}

export function segmentCapFor(tier: QualityTier): number {
  return tier === 'low' ? SEGMENT_CAP_LOW : SEGMENT_CAP;
}

/** A copy of the node set, sorted by angle. */
export function sortByAngle(nodes: readonly RingNode[]): RingNode[] {
  return nodes.slice().sort((p, q) => p.a - q.a);
}

export function thetaOf(level: number): number {
  return THETA_BASE + THETA_SPAN * (Math.max(0, Math.min(15, level)) / 15);
}

export function lambdaOf(variant: number): number {
  return LAMBDA_BASE + LAMBDA_SPAN * (Math.max(0, Math.min(15, variant)) / 15);
}

export interface FernParams {
  /** turning angle per nesting depth 0..gen (depth 0 is the trunk; unused) */
  theta: Float64Array;
  /** length ratio per nesting depth */
  lambda: Float64Array;
}

/** Per-depth parameters for `gen` generations from the sorted node set. */
export function paramsFor(sorted: readonly RingNode[], gen: number): FernParams {
  const theta = new Float64Array(gen + 1);
  const lambda = new Float64Array(gen + 1);
  const n = sorted.length;
  for (let d = 0; d <= gen; d++) {
    const node = n > 0 ? sorted[d % n] : undefined;
    theta[d] = thetaOf(node ? node.r : DEFAULT_LEVEL);
    lambda[d] = lambdaOf(node ? node.v : DEFAULT_VARIANT);
  }
  return { theta, lambda };
}

/** The cache key for a node arrangement: angles, radii, variants, in order. */
export function fernHash(sorted: readonly RingNode[]): string {
  let h = '';
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i] as RingNode;
    h += `${n.a.toFixed(4)}:${n.r}:${n.v};`;
  }
  return h;
}

/**
 * The expansion plan: how many F symbols expand at each level, given the cap.
 * N[ℓ] is the segment total after level ℓ; E[ℓ] the count expanded at level ℓ.
 */
export function planExpansion(gen: number, cap: number): { N: Int32Array; E: Int32Array } {
  const N = new Int32Array(gen + 1);
  const E = new Int32Array(gen + 1);
  N[0] = 1;
  for (let l = 1; l <= gen; l++) {
    const prev = N[l - 1] as number;
    const full = prev * 5;
    let e: number;
    if (full <= cap) e = prev;
    else e = Math.max(0, Math.floor((cap - prev) / 4));
    E[l] = e;
    N[l] = prev + 4 * e;
  }
  return { N, E };
}

/** Segment count the plan will produce — always ≤ cap. */
export function segmentCount(gen: number, cap: number): number {
  const { N } = planExpansion(gen, cap);
  return N[gen] as number;
}

export interface FernBuild {
  /** x0,y0,x1,y1 per segment */
  segs: Float32Array;
  /** nesting depth per segment, 0..gen */
  depth: Uint8Array;
  count: number;
  gen: number;
  /** the highest point reached (smallest y) */
  tipY: number;
}

export interface FernSpec {
  gen: number;
  params: FernParams;
  baseX: number;
  baseY: number;
  /** initial heading, 0 = up, clockwise positive */
  heading: number;
  /** trunk height when fully in line */
  height: number;
  cap: number;
  /** deterministic [0,1) source for the jitter */
  rnd: () => number;
}

/**
 * Build the fern with a turtle. Recursion depth is bounded by `gen` (≤ 7),
 * the turtle stack by the nesting depth (≤ gen + 1). Runs once per generation
 * per node arrangement, never per frame.
 */
export function buildFern(spec: FernSpec): FernBuild {
  const { gen, params, cap, rnd } = spec;
  const plan = planExpansion(gen, cap);
  const total = plan.N[gen] as number;
  const segs = new Float32Array(total * 4);
  const depth = new Uint8Array(total);
  const ord = new Int32Array(gen + 1);
  let count = 0;
  let tipY = spec.baseY;

  // turtle
  let x = spec.baseX;
  let y = spec.baseY;
  let phi = spec.heading;
  const stack = new Float64Array((gen + 2) * 3);
  let sp = 0;

  // The trunk bends toward up over its length: the fern reaches for the light.
  let delta = -spec.heading;
  delta = ((delta + Math.PI) % (2 * Math.PI)) - Math.PI;
  if (delta < -Math.PI) delta += 2 * Math.PI;
  const kappa = Math.max(-TROPISM_MAX, Math.min(TROPISM_MAX, delta)) / Math.max(1, spec.height);

  function shouldExpand(level: number, j: number): boolean {
    const e = plan.E[level] as number;
    const n = plan.N[level - 1] as number;
    if (e >= n) return true;
    if (e <= 0) return false;
    return Math.floor(((j + 1) * e) / n) > Math.floor((j * e) / n);
  }

  function leaf(len: number, d: number): void {
    if (count >= total) return;
    const h = phi + (rnd() - 0.5) * 2 * JITTER;
    const nx = x + len * Math.sin(h);
    const ny = y - len * Math.cos(h);
    const i = count * 4;
    segs[i] = x;
    segs[i + 1] = y;
    segs[i + 2] = nx;
    segs[i + 3] = ny;
    depth[count] = d;
    count++;
    x = nx;
    y = ny;
    if (ny < tipY) tipY = ny;
    phi += kappa * len;
  }

  function F(level: number, d: number, len: number): void {
    const j = ord[level] as number;
    ord[level] = j + 1;
    if (level >= gen || !shouldExpand(level + 1, j)) {
      leaf(len, d);
      return;
    }
    const piece = len / 3;
    const child = d + 1;
    const branchLen = piece * (params.lambda[child] as number);
    const theta = params.theta[child] as number;

    F(level + 1, d, piece);

    // [+F]
    stack[sp] = x;
    stack[sp + 1] = y;
    stack[sp + 2] = phi;
    sp += 3;
    phi += theta;
    F(level + 1, child, branchLen);
    sp -= 3;
    x = stack[sp] as number;
    y = stack[sp + 1] as number;
    phi = stack[sp + 2] as number;

    F(level + 1, d, piece);

    // [−F]
    stack[sp] = x;
    stack[sp + 1] = y;
    stack[sp + 2] = phi;
    sp += 3;
    phi -= theta * MINUS_RATIO;
    F(level + 1, child, branchLen);
    sp -= 3;
    x = stack[sp] as number;
    y = stack[sp + 1] as number;
    phi = stack[sp + 2] as number;

    F(level + 1, d, piece);
  }

  F(0, 0, spec.height);

  return { segs, depth, count, gen, tipY };
}

/** Trunk height by generation: crosses the far rim at the cap (2.3·R). */
export function heightFor(gen: number, cap: number, R: number): number {
  return R * (0.62 + 1.68 * (gen / Math.max(1, cap)));
}

/**
 * Depth is monotonic and honest (§D.7): 0.25 viewed, 0.5 gen ≥ 3, 0.75 a node
 * dragged, 1.0 generation at the cap.
 */
export function depthFor(gen: number, cap: number, dragged: boolean): number {
  let depth = 0.25;
  if (gen >= 3) depth = 0.5;
  if (dragged) depth = 0.75;
  if (gen >= cap) depth = 1;
  return depth;
}

/**
 * True when a node was moved (same ids, a changed angle or radius) — the
 * pointer drag or its keyboard equivalent (↑/↓).
 */
export function wasDragged(prev: readonly RingNode[], next: readonly RingNode[]): boolean {
  if (prev.length !== next.length || prev.length === 0) return false;
  for (let i = 0; i < prev.length; i++) {
    const p = prev[i] as RingNode;
    const q = next[i] as RingNode;
    if (p.id !== q.id) return false;
    if (p.a !== q.a || p.r !== q.r) return true;
  }
  return false;
}
