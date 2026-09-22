/**
 * src/sections/orbit/logic.ts — the pure half of ORBIT (§D.8).
 *
 * The visitor's nodes as epicycles: circles riding on circles, tracing their
 * TRUE sum. Nodes are sorted by angle; node i becomes one term of a
 * Fourier-style sum with an integer harmonic, so the traced curve always
 * closes:
 *
 *   Aᵢ = ρ(rᵢ) · 0.42 / (i+1)      kᵢ = i + 1      φᵢ = 2π·aᵢ
 *   P(t) = (cx, cy) + Σᵢ Aᵢ · ( sin(2π·kᵢ·t + φᵢ), −cos(2π·kᵢ·t + φᵢ) )
 *
 * Honesty note (§J.4): there is no "recognised silhouette". The curve is the
 * genuine sum of the visitor's own nodes and nothing else.
 *
 * No DOM here. The sampler writes into a caller-owned Float32Array so the
 * frame path allocates nothing.
 */

import { radiusOfLevel } from '@/lib/ring-geometry';
import type { RingNode } from '@/lib/types';

/** Samples along the traced curve (desktop / mobile). */
export const SAMPLES = 512;
export const SAMPLES_MOBILE = 256;
/** Mobile: the chain is capped to the twelve largest terms by amplitude. */
export const CHAIN_CAP_MOBILE = 12;
/** Amplitude scale: the first term's radius is 0.42·ρ. */
export const AMPLITUDE = 0.42;
/** Pointer proximity slows a circle's rendered phase to 35% for 600 ms. */
export const SLOW_MS = 600;
export const SLOW_FACTOR = 0.35;
/** After the slow, the lag re-converges with this time constant. */
export const RECONVERGE_MS = 220;
/** Cross-fade when the node set changes. */
export const CURVE_FADE_MS = 520;
/** Pointer within this many px of a circle's stroke counts as proximity. */
export const NEAR_PX = 16;
/** The traced curve closes with at least this many terms — the payoff. */
export const CLOSED_TERMS = 5;

export interface Term {
  /** amplitude in px */
  A: number;
  /** integer harmonic */
  k: number;
  /** phase in radians */
  phi: number;
  /** the node it came from */
  id: string;
}

/** Sort by angle; node i is the (i+1)th harmonic. */
export function termsFor(nodes: readonly RingNode[], R: number, chainCap: number): Term[] {
  const sorted = nodes.slice().sort((p, q) => p.a - q.a);
  const terms: Term[] = sorted.map((n, i) => ({
    A: (radiusOfLevel(n.r, R) * AMPLITUDE) / (i + 1),
    k: i + 1,
    phi: n.a * Math.PI * 2,
    id: n.id,
  }));
  if (terms.length <= chainCap) return terms;
  // keep the `chainCap` largest by amplitude, in harmonic order
  const kept = terms
    .slice()
    .sort((p, q) => q.A - p.A)
    .slice(0, chainCap)
    .sort((p, q) => p.k - q.k);
  return kept;
}

/** Evaluate P(t) into out[0], out[1]. Allocation-free. */
export function evalPoint(terms: readonly Term[], t: number, cx: number, cy: number, out: Float64Array): void {
  let x = cx;
  let y = cy;
  for (let i = 0; i < terms.length; i++) {
    const term = terms[i] as Term;
    const ang = Math.PI * 2 * term.k * t + term.phi;
    x += term.A * Math.sin(ang);
    y -= term.A * Math.cos(ang);
  }
  out[0] = x;
  out[1] = y;
}

/**
 * Sample the curve at n+1 points, t = 0..1 inclusive, into `out` (length
 * ≥ 2·(n+1)). The last sample is t = 1, which equals t = 0 because every
 * harmonic is an integer — that is the closure the room is built on.
 */
export function sampleCurve(
  terms: readonly Term[],
  cx: number,
  cy: number,
  n: number,
  out: Float32Array,
  scratch: Float64Array,
): void {
  for (let i = 0; i <= n; i++) {
    evalPoint(terms, i / n, cx, cy, scratch);
    out[i * 2] = scratch[0] as number;
    out[i * 2 + 1] = scratch[1] as number;
  }
}

/** |P(1) − P(0)| — zero up to floating point for integer harmonics. */
export function closureGap(terms: readonly Term[], cx: number, cy: number): number {
  const a = new Float64Array(2);
  const b = new Float64Array(2);
  evalPoint(terms, 0, cx, cy, a);
  evalPoint(terms, 1, cx, cy, b);
  return Math.hypot((b[0] as number) - (a[0] as number), (b[1] as number) - (a[1] as number));
}

/** The largest distance of the curve from its centre; sizes the band. */
export function maxRadius(samples: Float32Array, n: number, cx: number, cy: number): number {
  let m = 0;
  for (let i = 0; i <= n; i++) {
    const d = Math.hypot((samples[i * 2] as number) - cx, (samples[i * 2 + 1] as number) - cy);
    if (d > m) m = d;
  }
  return m;
}

/**
 * Depth is monotonic and honest (§D.8): 0.25 viewed, 0.5 ≥ 3 terms,
 * 0.75 a circle slowed, 1.0 a closed curve with ≥ 5 terms.
 */
export function depthFor(termCount: number, slowed: boolean): number {
  let depth = 0.25;
  if (termCount >= 3) depth = 0.5;
  if (slowed) depth = 0.75;
  if (termCount >= CLOSED_TERMS) depth = 1;
  return depth;
}

/** Pre-built harmonic labels, so the frame path never calls String(). */
export const LABELS: readonly string[] = Array.from({ length: 25 }, (_, i) => String(i));
