/**
 * src/sections/wear/logic.ts — the PURE half of WEAR (§D.10).
 *
 * No DOM, no canvas, no React. The thesis of the site in twelve lines: a loop
 * decays unless you change something — and the cheapest change revives it
 * completely. Nothing here punishes: `vigor` never reaches zero, no content is
 * ever removed, and there is no timer, streak or scarcity anywhere in this file.
 */

/** vigor is multiplied by this on each revolution while the room is active. */
export const DECAY = 0.94;
/** Doing nothing never reaches zero: the floor. The room stays legible. */
export const FLOOR = 0.22;
/** Below this the caption says `it's getting tired` (once, until revived). */
export const TIRED_AT = 0.6;
/** Any change sets vigor here, with a 900 ms --ease-enter overshoot… */
export const REVIVED = 1.15;
/** …and it then decays from here as before. */
export const RESTED = 1.0;
export const REVIVE_MS = 900;
/** `better.` stays for 2.5 s. */
export const BETTER_MS = 2500;
/** Reduced motion: each step is a 150 ms alpha transition, nothing else. */
export const STEP_MS = 150;
/** The revival light sweep runs one full circuit over --dur-7. */
export const SWEEP_CIRCUIT_MS = 720;
/** Depth 0.5 is reached when this has been seen. */
export const DEPTH_DIM_AT = 0.8;

/** One revolution of doing nothing. Never below the floor. */
export function decayed(vigor: number): number {
  return Math.max(FLOOR, vigor * DECAY);
}

/** How many revolutions of nothing until the caption — an honest 9 (≈36 s). */
export function revolutionsUntilTired(): number {
  let v = RESTED;
  let n = 0;
  while (v >= TIRED_AT) {
    v = decayed(v);
    n++;
  }
  return n;
}

/** The trail's memory shortens with vigor: 380 ms at full, 120 + 260·vigor. */
export function trailTau(vigor: number): number {
  return 120 + 260 * Math.min(1, vigor);
}

/** Ring stroke alpha = 0.35 + 0.5·vigor. */
export function ringAlpha(vigor: number): number {
  return 0.35 + 0.5 * Math.min(1, vigor);
}

/** Background gradient alpha = 0.04·vigor. */
export function bgAlpha(vigor: number): number {
  return 0.04 * vigor;
}

/** Audio gain (if on) = 0.8·vigor. */
export function audioGain(vigor: number): number {
  return 0.8 * vigor;
}

/** Lowpass cutoff (if on) = 400 + 6000·vigor Hz. */
export function lowpassHz(vigor: number): number {
  return 400 + 6000 * vigor;
}

/** cubic-bezier(.16,1,.3,1) — the --ease-enter token, evaluated in TS. */
export function easeEnter(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const p1x = 0.16;
  const p2x = 0.3;
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
  return bez(1, 1, u);
}

/**
 * The revival overshoot: from wherever vigor was, lift with --ease-enter to
 * REVIVED and settle at RESTED by the end of the 900 ms. k ∈ [0,1].
 */
export function reviveCurve(from: number, k: number): number {
  const e = easeEnter(k);
  const settle = RESTED + (from - RESTED) * (1 - e);
  return settle + (REVIVED - RESTED) * e * (1 - k * k);
}

/** Mix two RGB triples: 0 = a, 1 = b. */
export function mixRgb(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): [number, number, number] {
  const k = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k),
  ];
}

/** Parse a #rgb / #rrggbb / rgb() colour; anything else falls back. */
export function parseRgb(
  value: string,
  fallback: readonly [number, number, number],
): [number, number, number] {
  const v = value.trim();
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(v);
  if (long) return [parseInt(long[1]!, 16), parseInt(long[2]!, 16), parseInt(long[3]!, 16)];
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(v);
  if (short) {
    return [
      parseInt(short[1]!.repeat(2), 16),
      parseInt(short[2]!.repeat(2), 16),
      parseInt(short[3]!.repeat(2), 16),
    ];
  }
  const fn = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(v);
  if (fn) return [+fn[1]!, +fn[2]!, +fn[3]!];
  return [fallback[0], fallback[1], fallback[2]];
}

/**
 * Depth (§D.10): 0.25 viewed, 0.5 vigor < 0.8 seen, 0.75 the tired caption,
 * 1.0 a revival. Monotonic in the caller.
 */
export function depthFor(minVigorSeen: number, tiredSeen: boolean, revived: boolean): number {
  if (revived) return 1;
  if (tiredSeen) return 0.75;
  if (minVigorSeen < DEPTH_DIM_AT) return 0.5;
  return 0.25;
}
