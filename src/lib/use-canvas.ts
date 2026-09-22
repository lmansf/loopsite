'use client';

/**
 * src/lib/use-canvas.ts — canvas sizing, DPR policy and the decay recipe.
 *
 * Spec: design/11-narrative-build-spec.md §D.3. Retained from WP0; its only
 * change is that the ring geometry it used to compute is gone. It now reports
 * the canvas box and the DPR its backing store was sized at, which is exactly
 * what `Figure.draw(ctx, phase, w, h, dpr)` takes. Owned by WP-C.
 *
 * DPR: min(devicePixelRatio, heavy ? 1.5 : 2), with the total backing store
 * capped at 2.5 Mpx. Resize via a 100 ms-debounced ResizeObserver, never the
 * window `resize` event. The context is transformed so all drawing is in CSS
 * pixels.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CanvasGeometry } from './types.ts';
import { rgba } from './tokens.ts';

const MAX_BACKING_PX = 2_500_000;
const RESIZE_DEBOUNCE_MS = 100;

export function dprFor(w: number, h: number, heavy = false): number {
  const raw = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  // Touch devices get 1.5: the figures are stroke art, and a phone's GPU-less
  // worst case (software raster) pays for every backing-store pixel per frame.
  const coarse =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  let dpr = Math.min(raw, heavy || coarse ? 1.5 : 2);
  if (w > 0 && h > 0) {
    const budget = Math.sqrt(MAX_BACKING_PX / (w * h));
    if (budget < dpr) dpr = Math.max(1, budget);
  }
  return dpr;
}

/**
 * Size a canvas for a CSS box and return the ready 2D context.
 * Exported so a caller can drive more than one canvas from one ResizeObserver.
 */
export function sizeCanvas(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  dpr: number,
  opts?: CanvasRenderingContext2DSettings,
): CanvasRenderingContext2D | null {
  const bw = Math.max(1, Math.round(w * dpr));
  const bh = Math.max(1, Math.round(h * dpr));
  if (canvas.width !== bw) canvas.width = bw;
  if (canvas.height !== bh) canvas.height = bh;
  const ctx = canvas.getContext('2d', opts);
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/**
 * The frame-rate-independent exponential decay used for every trail in the
 * site (§C.2). Do not clear the layer; paint the canvas colour over it.
 *
 * `bg` is a token name ('--c-canvas') or any CSS colour string.
 */
export function decay(
  ctx: CanvasRenderingContext2D,
  dt: number,
  tauMs: number,
  bg: string,
): void {
  const alpha = 1 - Math.exp(-dt / Math.max(1, tauMs));
  const colour = bg.startsWith('--') ? rgba(bg, alpha) : bg;
  const c = ctx.canvas;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = bg.startsWith('--') ? 1 : alpha;
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.restore();
}

export function useCanvas(opts?: { heavy?: boolean }): {
  ref: React.RefObject<HTMLCanvasElement | null>;
  ctx: CanvasRenderingContext2D | null;
  geometry: CanvasGeometry;
} {
  const heavy = opts?.heavy === true;
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [geometry, setGeometry] = useState<CanvasGeometry>({ w: 0, h: 0, dpr: 1 });

  const measure = useCallback(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement ?? canvas;
    const w = parent.clientWidth || window.innerWidth;
    const h = parent.clientHeight || window.innerHeight;
    const dpr = dprFor(w, h, heavy);
    const next = sizeCanvas(canvas, w, h, dpr);
    setGeometry((prev) =>
      prev.w === w && prev.h === h && prev.dpr === dpr ? prev : { w, h, dpr },
    );
    setCtx((prev) => (prev === next ? prev : next));
  }, [heavy]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    measure();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(measure, RESIZE_DEBOUNCE_MS);
    });
    ro.observe(canvas.parentElement ?? canvas);
    return () => {
      if (timer) clearTimeout(timer);
      ro.disconnect();
    };
  }, [measure]);

  return { ref, ctx, geometry };
}
