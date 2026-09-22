/**
 * src/sections/origin/logic.ts — the PURE half of ORIGIN (and, by import, of
 * RETURN, which is ORIGIN again but lit). No DOM, no canvas, no React.
 *
 * Spec: design/05-build-spec.md §D.1, §D.12. Every magic number lives here.
 */

/* ------------------------------------------------------------ the field */

/** Background gradient: inner alpha A = 0.04 + 0.02 · min(count, 8) / 8. */
export const FIELD_BASE = 0.04;
export const FIELD_SPAN = 0.02;
/** RETURN's field is at full amplitude from the first frame (§D.12). */
export const FIELD_FULL = 0.06;
/** Breathing ±10% on a 4000 ms sine keyed to phase — a hard luminance cap. */
export const FIELD_BREATHE = 0.1;
/** Reduced motion: the gradient breathes opacity 0.80 ↔ 0.92 over 12 s. */
export const STILL_BREATHE_LO = 0.8;
export const STILL_BREATHE_HI = 0.92;
export const STILL_BREATHE_MS = 12_000;
/** Inner stop at 0.2 R, outer stop at 1.9 R. */
export const FIELD_INNER = 0.2;
export const FIELD_OUTER = 1.9;

export function fieldAlpha(nodeCount: number, base = FIELD_BASE): number {
  return base + FIELD_SPAN * (Math.min(Math.max(0, nodeCount), 8) / 8);
}

/** The breathing multiplier for the field's inner alpha. */
export function breathe(phase: number, t: number, reduced: boolean): number {
  if (reduced) {
    const mid = (STILL_BREATHE_LO + STILL_BREATHE_HI) / 2;
    const amp = (STILL_BREATHE_HI - STILL_BREATHE_LO) / 2;
    return mid + amp * Math.sin((2 * Math.PI * t) / STILL_BREATHE_MS);
  }
  return 1 + FIELD_BREATHE * Math.sin(2 * Math.PI * phase);
}

/* ------------------------------------------------------------ ripples */

/** On fire: a stroked circle 0 → 64 px over 520 ms, alpha .22 → 0, width 2 → .5. */
export const RIPPLE_MS = 520;
export const RIPPLE_PX = 64;
export const RIPPLE_ALPHA = 0.22;
/** Reduced motion: one static 32 px ring at 0.16 alpha fading over 150 ms. */
export const STILL_RIPPLE_MS = 150;
export const STILL_RIPPLE_PX = 32;
export const STILL_RIPPLE_ALPHA = 0.16;

export interface RippleFrame {
  radius: number;
  alpha: number;
  width: number;
}

/** `--ease-exit` cubic-bezier(.7,0,.84,0): ease-in. */
export function easeExit(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * t;
}

/** What a ripple looks like at `age` ms, or null once it is spent. */
export function rippleAt(age: number, reduced: boolean): RippleFrame | null {
  if (reduced) {
    const u = age / STILL_RIPPLE_MS;
    if (u >= 1) return null;
    return { radius: STILL_RIPPLE_PX, alpha: STILL_RIPPLE_ALPHA * (1 - u), width: 1 };
  }
  const u = age / RIPPLE_MS;
  if (u >= 1) return null;
  return { radius: RIPPLE_PX * easeExit(u), alpha: RIPPLE_ALPHA * (1 - u), width: 2 - 1.5 * u };
}

/* ------------------------------------------------------------ the second ring */

/** A second concentric ring at 0.72 R, 20% alpha, turning at 4/5 the rate. */
export const SECOND_RING_R = 0.72;
export const SECOND_RING_RATE = 4 / 5;
export const SECOND_RING_ALPHA = 0.2;
export const SECOND_RING_FADE_MS = 900;
/** In ORIGIN it appears after the third node. */
export const SECOND_RING_AFTER = 3;
export const SECOND_RING_HEAD_PX = 2;

export function mod1(x: number): number {
  const m = x % 1;
  return m < 0 ? m + 1 : m;
}

/** Twelve discrete steps per revolution (the clock's reduced-motion rule). */
export function quantize12(phase: number): number {
  return Math.floor(phase * 12) / 12;
}

/** Advance the second ring's own phase by one frame at 4/5 of the master rate. */
export function advanceSecondRing(phase2: number, dt: number, dir: 1 | -1, periodMs: number): number {
  return mod1(phase2 + (dir * dt * SECOND_RING_RATE) / periodMs);
}

/* ------------------------------------------------------------ crossing */

/** §C.3's frame-rate-independent crossing test for one angle. */
export function crossed(p0: number, p1: number, dir: 1 | -1, a: number): boolean {
  if (p0 === p1) return false;
  const travelled = Math.min(1, dir > 0 ? mod1(p1 - p0) : mod1(p0 - p1));
  const behind = dir > 0 ? mod1(p1 - a) : mod1(a - p1);
  return behind < travelled;
}

/* ------------------------------------------------------------ depth */

/** ORIGIN: 0.25 first node placed, 0.5 first fire, 0.75 third node, 1.0 second ring seen. */
export function originDepth(nodeCount: number, fired: boolean, secondRing: boolean): number {
  let d = 0;
  if (nodeCount >= 1) d = 0.25;
  if (fired) d = Math.max(d, 0.5);
  if (nodeCount >= 3) d = Math.max(d, 0.75);
  if (secondRing) d = 1;
  return d;
}
