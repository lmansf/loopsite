'use client';

/**
 * src/sections/trail/Room.tsx — TRAIL, notch 4 (§D.4). **WP3.**
 *
 * A pen on a rotating arm; the loop draws a figure nobody else has.
 *
 * An offscreen ink canvas is never cleared. Each frame the pen advances and a
 * segment is stroked onto the ink; the room canvas is cleared and composites
 * ink, then the arm and the live pen head. Once per revolution the ink is
 * composited against itself at 0.965 — a slow τ ≈ 110 s decay, so a 30 s
 * drawing is fully present and a 5 min one is a palimpsest, not mud.
 *
 * Reduced motion: the clock steps twelve times per revolution, the pen jumps
 * between the step positions and straight segments connect them — a clean
 * dodecagonal spirograph, drawn complete on the first frame and never faded.
 *
 * Every rule in §F.3 holds: one effect keyed on [seed, reducedMotion], no rAF
 * of its own, no matchMedia, no localStorage, nothing drawn on the ring layer,
 * and `props.nodes` is only ever read.
 */

import { useEffect, useRef } from 'react';
import { subscribeFrame } from '@/lib/clock';
import { rgba, token } from '@/lib/tokens';
import type { SectionProps } from '@/lib/types';
import type { KeptDetail } from '@/components/ui/KeepButton';
import {
  INK_FADE,
  DEFORM_PX,
  blend,
  colourMix,
  depthFor,
  kick,
  penPoint,
  stepSpring,
  stillPolygon,
  strokeWidth,
  triplet,
  type Spring,
} from './logic';

/** The ink layer's own DPR: ≤1.5 (the room is `heavy`), 1 at tier low. */
const INK_DPR_MAX = 1.5;
/** A resumed tab can hand us a large phase step; beyond this we lift the pen. */
const MAX_STEP_REV = 0.1;
/** `keep this` beside the press point, for 2 s (§D.4). */
const KEEP_LABEL_MS = 2000;

export default function Room(props: SectionProps) {
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  const depthRef = useRef(0);
  const viewedRef = useRef(false);

  useEffect(() => {
    const first = propsRef.current;
    const startRev = first.clock.revolution;
    if (!viewedRef.current) {
      viewedRef.current = true;
      first.onExplore({ name: 'section_viewed', section: first.id });
    }

    // ---- state that lives for the room's lifetime -------------------------
    const spring: Spring = { u: 0, v: 0 };
    let ink: HTMLCanvasElement | null = null;
    let inkCtx: CanvasRenderingContext2D | null = null;
    let inkW = 0;
    let inkH = 0;
    let prev: { x: number; y: number } | null = null;
    let prevPhase = -1;
    let lastRev = first.clock.revolution;
    let primed = false;
    let deformed = false;
    let kept = false;
    let keptAt: { x: number; y: number; t: number } | null = null;

    const c1 = triplet(rgba('--c-accent', 1));
    const c2 = triplet(rgba('--c-accent-hi', 1));
    const font = `12px ${token('--font-sans') || 'system-ui, sans-serif'}`;

    /** (Re)create the ink layer for the current geometry, keeping the drawing. */
    function ensureInk(w: number, h: number, dpr: number): void {
      const scale = Math.min(dpr, INK_DPR_MAX, propsRef.current.tier === 'low' ? 1 : INK_DPR_MAX);
      const bw = Math.max(1, Math.round(w * scale));
      const bh = Math.max(1, Math.round(h * scale));
      if (ink && inkW === bw && inkH === bh) return;
      const next = document.createElement('canvas');
      next.width = bw;
      next.height = bh;
      const nctx = next.getContext('2d');
      if (!nctx) return;
      if (ink && inkCtx) {
        // keep what was drawn, rescaled — the drawing is theirs
        nctx.drawImage(ink, 0, 0, bw, bh);
      }
      nctx.setTransform(scale, 0, 0, scale, 0, 0);
      nctx.lineCap = 'round';
      nctx.lineJoin = 'round';
      ink = next;
      inkCtx = nctx;
      inkW = bw;
      inkH = bh;
      prev = null;
    }

    function fadeInk(): void {
      if (!ink || !inkCtx) return;
      inkCtx.save();
      inkCtx.setTransform(1, 0, 0, 1, 0, 0);
      inkCtx.globalCompositeOperation = 'destination-in';
      inkCtx.fillStyle = `rgba(0, 0, 0, ${INK_FADE})`;
      inkCtx.fillRect(0, 0, inkW, inkH);
      inkCtx.restore();
    }

    function stroke(from: { x: number; y: number }, to: { x: number; y: number }, width: number, k: number, alpha: number): void {
      if (!inkCtx) return;
      inkCtx.strokeStyle = blend(c1, c2, k, alpha);
      inkCtx.lineWidth = width;
      inkCtx.beginPath();
      inkCtx.moveTo(from.x, from.y);
      inkCtx.lineTo(to.x, to.y);
      inkCtx.stroke();
    }

    /** The reduced-motion still: one complete revolution, drawn at once. */
    function prime(cx: number, cy: number, R: number): void {
      const pts = stillPolygon(cx, cy, R, spring.u);
      for (let i = 1; i < pts.length; i++) {
        stroke(pts[i - 1]!, pts[i]!, strokeWidth(0), 0, 0.5);
      }
    }

    function onKept(e: Event): void {
      const d = (e as CustomEvent<KeptDetail>).detail;
      kept = true;
      if (d && d.x !== null && d.y !== null) keptAt = { x: d.x, y: d.y, t: performance.now() };
    }
    const stage = document.getElementById('stage');
    stage?.addEventListener('loop:kept', onKept);

    // ---- the one draw callback ------------------------------------------
    const unsubscribe = subscribeFrame(() => {
      const p = propsRef.current;
      if (!p.visible) return;
      const { ctx, bg, geometry: g, clock, nodes, fired, reducedMotion } = p;
      if (!ctx || !bg || g.R <= 0) return;

      ensureInk(g.w, g.h, g.dpr);
      if (!inkCtx || !ink) return;

      // ---- background: a calm field, luminance following node density -----
      clear(bg);
      const density = 0.04 + 0.02 * (Math.min(nodes.length, 8) / 8);
      const grad = bg.createRadialGradient(g.cx, g.cy, g.R * 0.2, g.cx, g.cy, g.R * 1.9);
      grad.addColorStop(0, rgba('--c-accent', density));
      grad.addColorStop(1, rgba('--c-canvas', 0));
      bg.fillStyle = grad;
      bg.fillRect(0, 0, g.w, g.h);

      // ---- the spring: every fire kicks it, dt integrates it ---------------
      for (const ev of fired) kick(spring, ev.node.r);
      stepSpring(spring, clock.dt);
      if (Math.abs(spring.u) > DEFORM_PX) deformed = true;

      // ---- the ink fade, once per revolution (every two at tier low) --------
      if (clock.revolution !== lastRev) {
        const revs = Math.abs(clock.revolution - lastRev);
        lastRev = clock.revolution;
        if (!reducedMotion && (p.tier !== 'low' || clock.revolution % 2 === 0)) {
          for (let i = 0; i < Math.min(revs, 3); i++) fadeInk();
        }
      }

      // ---- the pen ----------------------------------------------------------
      const phase = clock.phase;
      const pen = penPoint(g.cx, g.cy, g.R, phase, spring.u);

      if (reducedMotion) {
        if (!primed) {
          primed = true;
          prime(g.cx, g.cy, g.R);
          prev = pen;
          prevPhase = phase;
        } else if (phase !== prevPhase) {
          // the pen jumps to the next step and a straight segment connects them
          if (prev) stroke(prev, pen, strokeWidth(spring.u), colourMix(spring.v), 0.55);
          prev = pen;
          prevPhase = phase;
        }
      } else {
        primed = true;
        if (prev && prevPhase >= 0) {
          const travelled = Math.abs(((phase - prevPhase + 1.5) % 1) - 0.5);
          if (travelled < MAX_STEP_REV) {
            const k = colourMix(spring.v);
            stroke(prev, pen, strokeWidth(spring.u), k, 0.35 + 0.65 * k);
          }
        }
        prev = pen;
        prevPhase = phase;
      }

      // ---- room layer: ink, arm, head ---------------------------------------
      clear(ctx);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // the ink is in its own device space; the room canvas may differ in DPR
      ctx.drawImage(ink, 0, 0, inkW, inkH, 0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();

      // the arm: a hairline from the centre to the pen
      ctx.strokeStyle = rgba('--c-border-strong', 0.55);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(g.cx, g.cy);
      ctx.lineTo(pen.x, pen.y);
      ctx.stroke();

      // the pen head, with a soft halo
      const k = colourMix(spring.v);
      ctx.fillStyle = blend(c1, c2, k, 0.18);
      ctx.beginPath();
      ctx.arc(pen.x, pen.y, 7 + 4 * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba('--c-accent-hi', 1);
      ctx.beginPath();
      ctx.arc(pen.x, pen.y, 2.6, 0, Math.PI * 2);
      ctx.fill();

      // `keep this` beside the press point, for 2 s
      if (keptAt) {
        const age = performance.now() - keptAt.t;
        if (age > KEEP_LABEL_MS) {
          keptAt = null;
        } else {
          const alpha = age > KEEP_LABEL_MS - 400 ? (KEEP_LABEL_MS - age) / 400 : 1;
          ctx.font = font;
          ctx.textBaseline = 'middle';
          ctx.textAlign = keptAt.x > g.w * 0.72 ? 'right' : 'left';
          ctx.fillStyle = rgba('--c-text-muted', alpha);
          ctx.fillText('keep this', keptAt.x + (keptAt.x > g.w * 0.72 ? -16 : 16), keptAt.y - 12);
        }
      }

      // ---- depth: monotonic, at most once per 0.25 step ----------------------
      const depth = depthFor(nodes.length, deformed, clock.revolution - startRev, kept);
      if (depth > depthRef.current) {
        depthRef.current = depth;
        p.onExplore({ name: 'depth_reached', section: p.id, depth });
      }
    });

    return () => {
      unsubscribe();
      stage?.removeEventListener('loop:kept', onKept);
      ink = null;
      inkCtx = null;
    };
  }, [props.seed, props.reducedMotion]);

  return null;
}

/** Clear a layer in device pixels, leaving the CSS-pixel transform intact. */
function clear(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}
