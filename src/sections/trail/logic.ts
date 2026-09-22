/**
 * src/sections/trail/logic.ts — the pure half of TRAIL (§D.4). No DOM.
 *
 * A pen on a rotating arm. The arm angle is the sweep angle; the pen's radial
 * offset `u` is a damped spring that every node fire kicks — inward for
 * r < 8, outward for r > 8. With no nodes the pen draws a calm trefoil; every
 * node bends it.
 */

/** u'' = −k·u − c·u'  (k = 90, c = 9), integrated with the clamped dt. */
export const SPRING_K = 90;
export const SPRING_C = 9;
/** Each fire injects u' += 260·(r−8)/8 and u += 6. */
export const IMPULSE_V = 260;
export const IMPULSE_U = 6;
/** ρ_pen = R·(0.62 + 0.26·sin(2π·3·phase)) + u */
export const PEN_BASE = 0.62;
export const PEN_AMP = 0.26;
export const PEN_LOBES = 3;
/** Stroke width 1.2 + 0.8·|u|/40. */
export const WIDTH_BASE = 1.2;
export const WIDTH_GAIN = 0.8;
export const WIDTH_NORM = 40;
/** Colour --c-trail-1 → --c-trail-2 by |u'| normalized to 300. */
export const SPEED_NORM = 300;
/** Once per revolution the ink is composited against itself at this alpha (τ ≈ 110 s). */
export const INK_FADE = 0.965;
/** Reduced motion: twelve step positions per revolution (§C.4). */
export const STEPS = 12;
/** "Visible deformation" for depth 0.5: the spring has moved this far. */
export const DEFORM_PX = 3;
/** The number of revolutions for depth 0.75. */
export const DRAWN_REVS = 4;

export interface Spring {
  /** radial offset, px */
  u: number;
  /** radial velocity, px/s */
  v: number;
}

/** Semi-implicit Euler with sub-steps: stable for any dt up to the 50 ms clamp. */
export function stepSpring(s: Spring, dtMs: number): void {
  const dt = Math.max(0, dtMs) / 1000;
  if (dt === 0) return;
  const n = dt > 0.02 ? 3 : 1;
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const a = -SPRING_K * s.u - SPRING_C * s.v;
    s.v += a * h;
    s.u += s.v * h;
  }
}

/** A node fire kicks the pen: level 8 is neutral, below pulls in, above pushes out. */
export function kick(s: Spring, level: number): void {
  s.v += (IMPULSE_V * (level - 8)) / 8;
  s.u += IMPULSE_U;
}

/** The pen's radius for a phase and offset. */
export function penRadius(R: number, phase: number, u: number): number {
  return R * (PEN_BASE + PEN_AMP * Math.sin(Math.PI * 2 * PEN_LOBES * phase)) + u;
}

/** The pen's screen point: 0 = 12 o'clock, clockwise. */
export function penPoint(
  cx: number,
  cy: number,
  R: number,
  phase: number,
  u: number,
): { x: number; y: number } {
  const rho = penRadius(R, phase, u);
  const t = phase * Math.PI * 2;
  return { x: cx + rho * Math.sin(t), y: cy - rho * Math.cos(t) };
}

export function strokeWidth(u: number): number {
  return WIDTH_BASE + (WIDTH_GAIN * Math.abs(u)) / WIDTH_NORM;
}

/** 0 → trail-1, 1 → trail-2. */
export function colourMix(v: number): number {
  return Math.max(0, Math.min(1, Math.abs(v) / SPEED_NORM));
}

/** Linear blend of two rgb triplets plus alpha. */
export function blend(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  k: number,
  alpha: number,
): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * k);
  const g = Math.round(a[1] + (b[1] - a[1]) * k);
  const bl = Math.round(a[2] + (b[2] - a[2]) * k);
  return `rgba(${r}, ${g}, ${bl}, ${alpha.toFixed(3)})`;
}

/** Parse an `rgba(r, g, b, a)` string from @/lib/tokens into a triplet. */
export function triplet(rgba: string): [number, number, number] {
  const m = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(rgba);
  if (!m) return [255, 255, 255];
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/**
 * Depth (§D.4): 0.25 first node, 0.5 visible deformation, 0.75 four
 * revolutions drawn, 1.0 a keep. Monotonic; reported once per 0.25 step.
 */
export function depthFor(
  nodeCount: number,
  deformed: boolean,
  revolutionsHere: number,
  kept: boolean,
): number {
  let depth = 0;
  if (nodeCount >= 1) depth = 0.25;
  if (deformed) depth = Math.max(depth, 0.5);
  if (revolutionsHere >= DRAWN_REVS) depth = Math.max(depth, 0.75);
  if (kept) depth = 1;
  return depth;
}

/**
 * The reduced-motion still: the twelve step positions of one revolution for
 * an unbent pen, as a closed polyline. A clean dodecagonal spirograph — a
 * designed variant, not a degraded one.
 */
export function stillPolygon(
  cx: number,
  cy: number,
  R: number,
  u: number,
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= STEPS; i++) pts.push(penPoint(cx, cy, R, (i % STEPS) / STEPS, u));
  return pts;
}
