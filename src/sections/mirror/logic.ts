/**
 * src/sections/mirror/logic.ts — the PURE half of MIRROR (§D.6).
 *
 * No DOM. The room is a feedback loop: the canvas draws its own previous
 * frame, transformed about the (leaning) centre by scale 0.94 and 1.5°·dir
 * at alpha 0.92, then this frame's marks on top. Every constant of that loop,
 * the tier-bounded accumulation, the deterministic ghost mark and the
 * reduced-motion still live here, named.
 */

import { hashSeed } from '@/lib/rng';
import type { QualityTier } from '@/lib/types';

/* ------------------------------------------------------------ the feedback */

export const FEEDBACK_SCALE = 0.94;
export const FEEDBACK_ALPHA = 0.92;
/** 1.5° per frame, signed by clock.dir */
export const FEEDBACK_ROT = (1.5 * Math.PI) / 180;

/**
 * Bounded accumulation (§D.6): N = 6 / 0.06 ≈ 100 frames at tier high, i.e.
 * the frame count after which content has shrunk by e⁻⁶ and is gone. Every N
 * frames the buffer core that holds everything older than N frames is
 * cleared, which caps the visible tunnel and the accumulation error.
 */
export const CLEAR_EVERY: Readonly<Record<QualityTier, number>> = {
  high: 100,
  mid: 60,
  low: 36,
};

/**
 * Tier low keeps the previous frame at half resolution: the transformed
 * draw then reads a quarter of the pixels and the copy back writes a quarter,
 * at the cost of a softer tunnel. Tiers only ever reduce work (§C.4).
 */
export const PREV_SCALE: Readonly<Record<QualityTier, number>> = {
  high: 1,
  mid: 1,
  low: 0.5,
};

/** the farthest anything is ever drawn from the centre, in units of R (level 15 + a fire arc) */
const FAR_R = 1.4;

/**
 * Radius (CSS px) of the buffer core that holds content older than N frames:
 * everything drawn within FAR_R·R (+ the pointer lean) N generations ago has
 * been scaled by 0.94^N toward the centre by now.
 */
export function coreRadius(R: number, tier: QualityTier): number {
  return (FAR_R * R + LEAN_PX) * Math.pow(FEEDBACK_SCALE, CLEAR_EVERY[tier]) + 2;
}

/* ------------------------------------------------------------ marks */

/** a node fire draws a 16 px accent arc that then recedes inward forever */
export const FIRE_ARC_PX = 16;
/** the arc is held for a few frames so the echo reads as a pulse, not a hairline */
export const FIRE_HOLD_MS = 70;
/** under reduced motion the arc holds for one sweep step */
export const FIRE_HOLD_STILL_MS = 340;
export const FIRE_SLOTS = 32;
/** twelve ticks on the ring echo make the tunnel's rotation legible */
export const TICKS = 12;

/* ------------------------------------------------------------ the ghost */

/** at revolution >= 8 in-room, for 3 revolutions, one generated mark deep in the tunnel */
export const GHOST_REVOLUTION = 8;
export const GHOST_REVOLUTIONS = 3;
export const GHOST_SCALE = 0.55;

/** The ghost's angle (normalized turn), derived from the seed and nothing else. */
export function ghostAngle(seed: number): number {
  return hashSeed(seed, 'mirror');
}

export function ghostActive(revolutionsHere: number): boolean {
  return (
    revolutionsHere >= GHOST_REVOLUTION && revolutionsHere < GHOST_REVOLUTION + GHOST_REVOLUTIONS
  );
}

/* ------------------------------------------------------------ the lean */

export const LEAN_PX = 24;
export const LEAN_LERP = 0.08;

/** Pointer offset from the centre, normalized by R and clamped, scaled to LEAN_PX. */
export function leanFor(delta: number, R: number): number {
  if (R <= 0) return 0;
  const k = delta / R;
  return Math.max(-1, Math.min(1, k)) * LEAN_PX;
}

/* ------------------------------------------------------------ reduced motion */

/** the outer tunnel, drawn once: 6 nested, rotated, progressively dimmer rings */
export const STILL_RINGS = 6;
export const STILL_SCALE = 0.84;
export const STILL_ROT = (6 * Math.PI) / 180;
export const STILL_ALPHA_DECAY = 0.78;

/* ------------------------------------------------------------ depth */

/** 0.25 viewed, 0.5 first echo, 0.75 pointer lean, 1.0 ghost mark seen. */
export function depthFor(echoed: boolean, leaned: boolean, ghostSeen: boolean): number {
  if (ghostSeen) return 1;
  if (leaned) return 0.75;
  if (echoed) return 0.5;
  return 0.25;
}
