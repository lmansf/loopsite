/**
 * src/sections/pulse/logic.ts — the pure half of PULSE. No DOM, no canvas.
 *
 * Spec: design/05-build-spec.md §D.2.
 */

import type { RingNode } from '@/lib/types';

export type Voice = 'kick' | 'snare' | 'hat';

/** Radius level selects a voice: r < 5 kick, 5..10 snare, > 10 hat (§D.2). */
export function voiceOf(r: number): Voice {
  if (r < 5) return 'kick';
  if (r <= 10) return 'snare';
  return 'hat';
}

/** 0 kick, 1 snare, 2 hat — the glyph crossfade index. */
export function voiceIndex(v: Voice): number {
  return v === 'kick' ? 0 : v === 'snare' ? 1 : 2;
}

/** The shock ring's final radius: min(0.9R, 180 px). */
export function shockRadius(R: number): number {
  return Math.min(0.9 * R, 180);
}

export const SHOCK_MS = 300;
export const SPRING_MS = 420;
export const FLASH_MIN_INTERVAL_MS = 400;
export const FLASH_MS = 90;
export const FLASH_AMPLITUDE = 0.06;

/**
 * The 2.5 Hz floor. At most one global flash per 400 ms, whatever the node
 * arrangement: every downbeat and every fire *requests* a flash; the gate
 * emits at most one per window and never sums amplitudes.
 */
export class FlashGate {
  private last = -Infinity;
  constructor(private readonly minIntervalMs = FLASH_MIN_INTERVAL_MS) {}

  /** True when a flash may be emitted at time `t` (ms). Consumes the window. */
  request(t: number): boolean {
    if (t - this.last < this.minIntervalMs) return false;
    this.last = t;
    return true;
  }

  /** ms since the last emitted flash, or Infinity. */
  since(t: number): number {
    return t - this.last;
  }
}

/** Kick shocks displace the ring stroke: 1/(1+d²/120²) falloff, max 4 px. */
export function ringDisplacement(distancePx: number, spring: number): number {
  return (4 * spring) / (1 + (distancePx * distancePx) / (120 * 120));
}

/** Spring-back over 420 ms: a damped return that overshoots once, gently. */
export function springBack(ageMs: number): number {
  if (ageMs >= SPRING_MS) return 0;
  const k = ageMs / SPRING_MS;
  return Math.exp(-3.2 * k) * Math.cos(k * Math.PI * 1.35);
}

/** The bulge's visibility over its 420 ms life: 1 → 0. */
export function springBackAge(ageMs: number): number {
  return Math.max(0, 1 - ageMs / SPRING_MS);
}

/** How many distinct voices the node set uses. */
export function voicesUsed(nodes: readonly RingNode[]): number {
  const seen = new Set<Voice>();
  for (const n of nodes) seen.add(voiceOf(n.r));
  return seen.size;
}

/**
 * §D.2 depth: 0.25 first node, 0.5 two voices used, 0.75 sound petal pressed
 * or four nodes firing, 1.0 all three voices present. Monotonic by caller.
 */
export function depthFor(
  nodes: readonly RingNode[],
  firedIds: number,
  petalPressed: boolean,
): number {
  if (nodes.length === 0) return 0;
  const voices = voicesUsed(nodes);
  if (voices >= 3) return 1;
  if (petalPressed || firedIds >= 4) return 0.75;
  if (voices >= 2) return 0.5;
  return 0.25;
}
