/**
 * src/sections/origin/field.ts — the canvas half ORIGIN and RETURN share.
 *
 * Spec: design/05-build-spec.md §D.1, §D.12. Draws only on the layers a room
 * is handed (`props.ctx`, `props.bg`); never the ring layer. Colours come from
 * tokens; numbers come from ./logic.
 */

import { pointAt, radiusOfLevel } from '@/lib/ring-geometry';
import { rgba } from '@/lib/tokens';
import type { RingGeometry } from '@/lib/types';
import {
  FIELD_INNER,
  FIELD_OUTER,
  rippleAt,
  SECOND_RING_HEAD_PX,
  SECOND_RING_R,
} from './logic';

/** Clear a layer in device pixels, leaving the CSS-pixel transform intact. */
export function clearLayer(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

/**
 * The field: one radial gradient centred on the ring, inner stop at 0.2 R in
 * the accent at `alpha`, outer stop at 1.9 R fully transparent (the body
 * already carries --c-canvas, so the gradient is the light, not the dark).
 */
export function drawField(ctx: CanvasRenderingContext2D, g: RingGeometry, alpha: number): void {
  const grad = ctx.createRadialGradient(g.cx, g.cy, g.R * FIELD_INNER, g.cx, g.cy, g.R * FIELD_OUTER);
  grad.addColorStop(0, rgba('--c-accent', alpha));
  grad.addColorStop(0.55, rgba('--c-accent', alpha * 0.35));
  grad.addColorStop(1, rgba('--c-accent', 0));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, g.w, g.h);
}

/**
 * The field, rasterized once per distinct (geometry, 8-bit alpha) into an
 * offscreen bitmap and blitted each frame: a full-viewport gradient is the most
 * expensive thing either room paints, and its alpha only takes a handful of
 * distinct 8-bit values per revolution.
 */
export interface FieldCache {
  canvas: HTMLCanvasElement | null;
  key: string;
}

export function newFieldCache(): FieldCache {
  return { canvas: null, key: '' };
}

export function drawFieldCached(ctx: CanvasRenderingContext2D, g: RingGeometry, alpha: number, cache: FieldCache): void {
  const a = Math.round(alpha * 255) / 255;
  const dpr = ctx.canvas.width / Math.max(1, g.w);
  const key = `${g.w}|${g.h}|${g.R}|${g.cx}|${g.cy}|${dpr}|${a}`;
  if (cache.key !== key || !cache.canvas) {
    const c = cache.canvas ?? document.createElement('canvas');
    if (c.width !== ctx.canvas.width) c.width = ctx.canvas.width;
    if (c.height !== ctx.canvas.height) c.height = ctx.canvas.height;
    const off = c.getContext('2d');
    if (!off) {
      drawField(ctx, g, a);
      return;
    }
    off.setTransform(1, 0, 0, 1, 0, 0);
    off.clearRect(0, 0, c.width, c.height);
    off.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawField(off, g, a);
    cache.canvas = c;
    cache.key = key;
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(cache.canvas, 0, 0);
  ctx.restore();
}

export interface Ripple {
  x: number;
  y: number;
  age: number;
}

/** Advance and draw every ripple; spent ripples are dropped in place. */
export function drawRipples(ctx: CanvasRenderingContext2D, ripples: Ripple[], dt: number, reduced: boolean): void {
  for (let i = ripples.length - 1; i >= 0; i--) {
    const rp = ripples[i]!;
    rp.age += dt;
    const f = rippleAt(rp.age, reduced);
    if (!f) {
      ripples.splice(i, 1);
      continue;
    }
    ctx.lineWidth = f.width;
    ctx.strokeStyle = rgba('--c-accent', f.alpha);
    ctx.beginPath();
    ctx.arc(rp.x, rp.y, f.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** The second concentric ring at 0.72 R with its own 2 px head. */
export function drawSecondRing(
  ctx: CanvasRenderingContext2D,
  g: RingGeometry,
  phase2: number,
  alpha: number,
  reduced: boolean,
): void {
  if (alpha <= 0) return;
  const r = g.R * SECOND_RING_R;
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba('--c-accent', alpha);
  ctx.beginPath();
  ctx.arc(g.cx, g.cy, r, 0, Math.PI * 2);
  ctx.stroke();

  const t = phase2 * Math.PI * 2;
  const hx = g.cx + r * Math.sin(t);
  const hy = g.cy - r * Math.cos(t);
  if (!reduced) {
    // a short tail, the same polyrhythm read at a glance
    const tail = 0.05;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = rgba('--c-accent-hi', alpha * 1.6);
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, r, t - Math.PI / 2 - tail * Math.PI * 2, t - Math.PI / 2);
    ctx.stroke();
  }
  ctx.fillStyle = rgba('--c-accent-hi', Math.min(1, alpha * 4));
  ctx.beginPath();
  ctx.arc(hx, hy, SECOND_RING_HEAD_PX, 0, Math.PI * 2);
  ctx.fill();
}

/** The screen point of a node-space position; exported so rooms share one mapping. */
export function nodePoint(a: number, level: number, g: RingGeometry): { x: number; y: number } {
  return pointAt(a, level, g);
}

/** RETURN's traces: 1 px arcs at 1.3 R, one twelfth each, at the visited notches. */
export function drawTraces(ctx: CanvasRenderingContext2D, g: RingGeometry, notches: readonly number[]): void {
  if (notches.length === 0) return;
  const r = radiusOfLevel(8, g.R) * 1.3;
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba('--c-accent', 0.18);
  ctx.lineCap = 'butt';
  for (const i of notches) {
    const from = ((i - 1) / 12) * Math.PI * 2 - Math.PI / 2;
    const to = (i / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, r, from + 0.01, to - 0.01);
    ctx.stroke();
  }
}
