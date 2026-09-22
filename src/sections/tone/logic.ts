/**
 * src/sections/tone/logic.ts — the pure half of TONE. No DOM, no canvas.
 *
 * Spec: design/05-build-spec.md §D.3.
 */

import type { FireEvent, RingNode } from '@/lib/types';

/** Minor pentatonic over three octaves, 16 entries indexed by radius level. */
export const SCALE: readonly number[] = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24, 27, 29, 31, 34, 36];

export const BASE_HZ = 220;
/** The second ring: 0.72R, period 5000 ms — 4/5 of the sweep's angular rate. */
export const SECOND_RING = 0.72;
export const SECOND_RATE = 4 / 5;
/** 4 s and 5 s periods coincide every 5 inner revolutions = 20 000 ms. */
export const REALIGN_REVS = 5;
export const STRING_AMPLITUDE = 14;
export const STRING_TAU_MS = 520;
export const REALIGN_SWEEP_MS = 720;
export const REALIGN_LIFT_MS = 150;

function mod1(x: number): number {
  const m = x % 1;
  return m < 0 ? m + 1 : m;
}

/** f(r) = 220 · 2^(scale[r]/12), with `r` snapped to the nearest level. */
export function freqOf(r: number): number {
  const i = Math.max(0, Math.min(15, Math.round(r)));
  return BASE_HZ * Math.pow(2, (SCALE[i] as number) / 12);
}

/** A continuous pitch for a level between two scale steps — the drag glide. */
export function freqOfContinuous(level: number): number {
  const c = Math.max(0, Math.min(15, level));
  const lo = Math.floor(c);
  const hi = Math.min(15, lo + 1);
  const f = c - lo;
  const semis = (SCALE[lo] as number) * (1 - f) + (SCALE[hi] as number) * f;
  return BASE_HZ * Math.pow(2, semis / 12);
}

/** The string's wave number: k = 3 + r mod 5. */
export function stringK(r: number): number {
  return 3 + (Math.max(0, Math.round(r)) % 5);
}

/**
 * The second ring's phase is a true function of the master clock: at 4/5 the
 * rate, five inner revolutions are exactly four outer ones, so both heads cross
 * a = 0 together every 20 000 ms. `u` is the continuous revolution count.
 */
export function secondPhase(revolution: number, phase: number): number {
  return mod1(SECOND_RATE * (revolution + phase));
}

/** Which 20 s cycle a moment belongs to; a change means the heads realigned. */
export function realignCycle(revolution: number, phase: number): number {
  return Math.floor((revolution + phase) / REALIGN_REVS);
}

/**
 * §C.3's frame-rate independent firing test, applied to the second ring's own
 * phase. `out` is reused so the frame loop allocates nothing.
 */
export function firesBetween(
  p0: number,
  p1: number,
  dir: 1 | -1,
  nodes: readonly RingNode[],
  out: FireEvent[],
  periodMs: number,
): FireEvent[] {
  out.length = 0;
  if (p0 === p1) return out;
  const travelled = Math.min(1, dir > 0 ? mod1(p1 - p0) : mod1(p0 - p1));
  for (const n of nodes) {
    const behind = dir > 0 ? mod1(p1 - n.a) : mod1(n.a - p1);
    if (behind < travelled) out.push({ node: n, lateness: behind * periodMs });
  }
  return out;
}

/** String amplitude after a fire: 14 px decaying with τ = 520 ms. */
export function stringAmplitude(msSinceFire: number): number {
  if (!Number.isFinite(msSinceFire)) return 0;
  return STRING_AMPLITUDE * Math.exp(-msSinceFire / STRING_TAU_MS);
}

export function distinctPitches(nodes: readonly RingNode[]): number {
  const seen = new Set<number>();
  for (const n of nodes) seen.add(Math.round(n.r));
  return seen.size;
}

/**
 * §D.3 depth: 0.25 first node, 0.5 a radial drag, 0.75 three distinct
 * pitches, 1.0 the realignment witnessed. Monotonic by caller.
 */
export function depthFor(nodes: readonly RingNode[], dragged: boolean, realigned: boolean): number {
  if (realigned) return 1;
  if (distinctPitches(nodes) >= 3) return 0.75;
  if (dragged) return 0.5;
  if (nodes.length >= 1) return 0.25;
  return 0;
}
