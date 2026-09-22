'use client';

/**
 * src/sections/mirror/Room.tsx — MIRROR (§D.6): it sees itself.
 *
 * The canvas draws its own previous frame — an infinite tunnel. Each frame:
 * draw `prev` transformed about the (leaning) centre by scale 0.94 and
 * rotate 1.5°·dir at alpha 0.92; draw this frame's marks on top; copy the
 * result to `prev`. Node fires draw a 16 px accent arc that recedes inward
 * forever. At revolution >= 8 in-room, one deterministic ghost mark derived
 * from hashSeed(seed, 'mirror') is drawn deep in the tunnel for three
 * revolutions — generated, never attributed.
 *
 * The room declares `heavy: true` (index.ts), so RingStage sizes the room and
 * background layers at DPR <= 1.5. The room context itself is created by the
 * stage; the offscreen `prev` buffer is the room's own.
 *
 * Nothing allocates in the frame callback: positions are computed inline,
 * palette strings are refreshed once per revolution, the fire pool and the
 * glow gradient are created once.
 */

import { useEffect, useRef } from 'react';
import { subscribeFrame } from '@/lib/clock';
import { radiusOfLevel } from '@/lib/ring-geometry';
import { rgba } from '@/lib/tokens';
import type { RingNode, SectionProps } from '@/lib/types';
import {
  CLEAR_EVERY,
  FEEDBACK_ALPHA,
  FEEDBACK_ROT,
  FEEDBACK_SCALE,
  FIRE_ARC_PX,
  FIRE_HOLD_MS,
  FIRE_HOLD_STILL_MS,
  FIRE_SLOTS,
  GHOST_SCALE,
  LEAN_LERP,
  PREV_SCALE,
  STILL_ALPHA_DECAY,
  STILL_RINGS,
  STILL_ROT,
  STILL_SCALE,
  TICKS,
  coreRadius,
  depthFor,
  ghostActive,
  ghostAngle,
  leanFor,
} from './logic';

const TAU = Math.PI * 2;

export default function Room(props: SectionProps) {
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  const depthRef = useRef(0);
  const viewedRef = useRef(false);
  const stateRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    // ---- 1. setup, once, keyed on [seed, reducedMotion] -------------------
    const first = propsRef.current;
    const startRev = first.clock.revolution;
    if (!viewedRef.current) {
      viewedRef.current = true;
      first.onExplore({ name: 'section_viewed', section: first.id });
    }

    // The previous frame. Transparent, so the tunnel composes over the
    // background layer; it is cleared and refilled every frame (never
    // accumulated into), and its core is cleared every N frames by tier.
    const prev = document.createElement('canvas');
    const prevCtx = prev.getContext('2d');
    if (!prevCtx) return;

    const gAngle = ghostAngle(first.seed);
    const fireX = new Float32Array(FIRE_SLOTS);
    const fireY = new Float32Array(FIRE_SLOTS);
    const fireAge = new Float32Array(FIRE_SLOTS).fill(-1);

    let leanX = 0;
    let leanY = 0;
    let targetX = 0;
    let targetY = 0;
    let frames = 0;
    let echoes = 0;
    let leaned = false;
    let ghostSeen = false;
    let ghostRot = 0;
    let lastRev = startRev;
    let bgW = 0;
    let bgH = 0;
    let bgR = 0;
    let cacheNodes: readonly RingNode[] | null = null;
    let cacheW = 0;
    let cacheH = 0;
    let cacheR = 0;
    let cacheDir = 0;
    let glow: CanvasGradient | null = null;
    let shownEchoes = -1;
    let shownLean = false;
    let shownGhost = false;

    let cRing = '';
    let cAccent = '';
    let cAccentHi = '';
    let cGhost = '';
    function palette(): void {
      cRing = rgba('--c-border-strong', 1);
      cAccent = rgba('--c-accent', 1);
      cAccentHi = rgba('--c-accent-hi', 1);
      cGhost = rgba('--c-accent-2', 1);
    }
    palette();

    function clear(c: CanvasRenderingContext2D): void {
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, c.canvas.width, c.canvas.height);
      c.restore();
    }

    /**
     * This frame's marks: the ring echo with twelve ticks, the sweep head,
     * every node with a soft halo. `phase < 0` skips the sweep (the still).
     * `alpha` scales everything, so the still can draw dimmer generations.
     */
    function drawMarks(
      c: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      R: number,
      nodes: readonly RingNode[],
      phase: number,
      alpha: number,
    ): void {
      c.lineWidth = 1.2;
      c.strokeStyle = cRing;
      c.globalAlpha = 0.55 * alpha;
      c.beginPath();
      c.arc(cx, cy, R, 0, TAU);
      c.stroke();

      c.globalAlpha = 0.5 * alpha;
      c.beginPath();
      for (let i = 0; i < TICKS; i++) {
        const t = (i / TICKS) * TAU;
        const s = Math.sin(t);
        const k = Math.cos(t);
        c.moveTo(cx + (R - 4) * s, cy - (R - 4) * k);
        c.lineTo(cx + (R + 4) * s, cy - (R + 4) * k);
      }
      c.stroke();

      if (phase >= 0) {
        const t = phase * TAU;
        c.fillStyle = cAccentHi;
        c.globalAlpha = 0.9 * alpha;
        c.beginPath();
        c.arc(cx + R * Math.sin(t), cy - R * Math.cos(t), 2.2, 0, TAU);
        c.fill();
      }

      c.fillStyle = cAccent;
      for (let i = 0; i < nodes.length; i++) {
        const nd = nodes[i];
        if (!nd) continue;
        const rho = radiusOfLevel(nd.r, R);
        const t = nd.a * TAU;
        const x = cx + rho * Math.sin(t);
        const y = cy - rho * Math.cos(t);
        c.globalAlpha = 0.16 * alpha;
        c.beginPath();
        c.arc(x, y, 7, 0, TAU);
        c.fill();
        c.globalAlpha = 0.95 * alpha;
        c.beginPath();
        c.arc(x, y, 2.6, 0, TAU);
        c.fill();
      }
      c.globalAlpha = 1;
    }

    /** The 16 px accent arc of every fire still inside its hold window. */
    function drawFires(c: CanvasRenderingContext2D, holdMs: number): void {
      c.strokeStyle = cAccent;
      c.fillStyle = cAccent;
      c.lineWidth = 2.2;
      for (let k = 0; k < FIRE_SLOTS; k++) {
        const age = fireAge[k]!;
        if (age < 0 || age > holdMs) continue;
        const fade = 1 - age / holdMs;
        c.globalAlpha = 0.22 * fade;
        c.beginPath();
        c.arc(fireX[k]!, fireY[k]!, FIRE_ARC_PX, 0, TAU);
        c.fill();
        c.globalAlpha = fade;
        c.beginPath();
        c.arc(fireX[k]!, fireY[k]!, FIRE_ARC_PX, 0, TAU);
        c.stroke();
      }
      c.globalAlpha = 1;
    }

    function drawGhost(c: CanvasRenderingContext2D, ox: number, oy: number, angle: number, R: number): void {
      const x = ox + GHOST_SCALE * R * Math.sin(angle);
      const y = oy - GHOST_SCALE * R * Math.cos(angle);
      c.fillStyle = cGhost;
      c.globalAlpha = 0.22;
      c.beginPath();
      c.arc(x, y, 8, 0, TAU);
      c.fill();
      c.globalAlpha = 0.9;
      c.beginPath();
      c.arc(x, y, 3, 0, TAU);
      c.fill();
      c.globalAlpha = 1;
    }

    function addFire(x: number, y: number): void {
      let slot = -1;
      let oldest = 0;
      let oldestAge = -1;
      for (let k = 0; k < FIRE_SLOTS; k++) {
        const age = fireAge[k]!;
        if (age < 0) {
          slot = k;
          break;
        }
        if (age > oldestAge) {
          oldestAge = age;
          oldest = k;
        }
      }
      if (slot < 0) slot = oldest;
      fireX[slot] = x;
      fireY[slot] = y;
      fireAge[slot] = 0;
    }

    function ageFires(dt: number, holdMs: number): void {
      for (let k = 0; k < FIRE_SLOTS; k++) {
        const age = fireAge[k]!;
        if (age < 0) continue;
        const next = age + dt;
        fireAge[k] = next > holdMs ? -1 : next;
      }
    }

    /** The outer tunnel under reduced motion: drawn once into `prev`. */
    function buildStill(
      cx: number,
      cy: number,
      R: number,
      nodes: readonly RingNode[],
      dir: number,
      dpr: number,
    ): void {
      clear(prevCtx!);
      for (let k = STILL_RINGS; k >= 1; k--) {
        const s = Math.pow(STILL_SCALE, k);
        prevCtx!.setTransform(dpr, 0, 0, dpr, 0, 0);
        prevCtx!.translate(cx, cy);
        prevCtx!.rotate(STILL_ROT * k * dir);
        prevCtx!.scale(s, s);
        prevCtx!.translate(-cx, -cy);
        drawMarks(prevCtx!, cx, cy, R, nodes, -1, Math.pow(STILL_ALPHA_DECAY, k));
      }
      prevCtx!.setTransform(1, 0, 0, 1, 0, 0);
    }

    // ---- pointer: the tunnel leans toward the pointer by up to 24 px ------
    const stage = document.getElementById('stage');
    function onMove(e: PointerEvent): void {
      if (!stage) return;
      const g = propsRef.current.geometry;
      const rect = stage.getBoundingClientRect();
      targetX = leanFor(e.clientX - rect.left - g.cx, g.R);
      targetY = leanFor(e.clientY - rect.top - g.cy, g.R);
      if (Math.abs(targetX) > 1 || Math.abs(targetY) > 1) leaned = true;
    }
    function onLeave(): void {
      targetX = 0;
      targetY = 0;
    }
    stage?.addEventListener('pointermove', onMove, { passive: true });
    stage?.addEventListener('pointerleave', onLeave, { passive: true });

    // ---- 2. one draw callback, registered with the shared clock ----------
    const unsubscribe = subscribeFrame(() => {
      const p = propsRef.current;
      if (!p.visible) return;
      const { ctx, bg, geometry: g, clock, nodes, fired, reducedMotion, tier } = p;
      if (!ctx || !bg || g.R <= 0 || g.w <= 0 || g.h <= 0) return;

      const w = g.w;
      const h = g.h;
      const dt = clock.dt;
      const revHere = clock.revolution - startRev;
      if (clock.revolution !== lastRev) {
        lastRev = clock.revolution;
        palette();
      }

      // ---- background: a deep, still glow at the end of the tunnel, drawn once per geometry
      if (!glow) {
        glow = bg.createRadialGradient(0, 0, 0, 0, 0, 1);
        glow.addColorStop(0, rgba('--c-accent-2', 0.16));
        glow.addColorStop(0.5, rgba('--c-accent', 0.05));
        glow.addColorStop(1, rgba('--c-accent', 0));
      }
      if (w !== bgW || h !== bgH || g.R !== bgR) {
        bgW = w;
        bgH = h;
        bgR = g.R;
        clear(bg);
        bg.save();
        bg.translate(g.cx, g.cy);
        bg.scale(g.R * 1.5, g.R * 1.5);
        bg.fillStyle = glow;
        bg.fillRect(-1, -1, 2, 2);
        bg.restore();
      }

      // ---- keep `prev` sized to the room layer (a quarter of it at tier low)
      const bw = ctx.canvas.width;
      const bh = ctx.canvas.height;
      const prevScale = reducedMotion ? 1 : PREV_SCALE[tier];
      const pw = Math.max(1, Math.round(bw * prevScale));
      const ph = Math.max(1, Math.round(bh * prevScale));
      if (prev.width !== pw || prev.height !== ph) {
        prev.width = pw;
        prev.height = ph;
        cacheNodes = null;
      }
      const dpr = bw / w;
      const prevDpr = pw / w;

      // ---- every fire is an echo
      for (let k = 0; k < fired.length; k++) {
        const ev = fired[k];
        if (!ev) continue;
        const rho = radiusOfLevel(ev.node.r, g.R);
        const t = ev.node.a * TAU;
        addFire(g.cx + rho * Math.sin(t), g.cy - rho * Math.cos(t));
        echoes++;
      }

      const ghostOn = ghostActive(revHere);
      if (ghostOn) ghostSeen = true;

      if (reducedMotion) {
        /* ============ the still: six nested rings, only the innermost frame updates ============ */
        if (
          cacheNodes !== nodes ||
          cacheW !== w ||
          cacheH !== h ||
          cacheR !== g.R ||
          cacheDir !== clock.dir
        ) {
          cacheNodes = nodes;
          cacheW = w;
          cacheH = h;
          cacheR = g.R;
          cacheDir = clock.dir;
          buildStill(g.cx, g.cy, g.R, nodes, clock.dir, dpr);
        }
        clear(ctx);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(prev, 0, 0);
        ctx.restore();
        drawMarks(ctx, g.cx, g.cy, g.R, nodes, clock.phase, 1);
        drawFires(ctx, FIRE_HOLD_STILL_MS);
        if (ghostOn) drawGhost(ctx, g.cx, g.cy, gAngle * TAU, g.R);
        ageFires(dt, FIRE_HOLD_STILL_MS);
      } else {
        /* ============ the feedback loop ============ */
        leanX += (targetX - leanX) * LEAN_LERP;
        leanY += (targetY - leanY) * LEAN_LERP;
        const ox = g.cx + leanX;
        const oy = g.cy + leanY;
        const rot = FEEDBACK_ROT * clock.dir;

        clear(ctx);
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(rot);
        ctx.scale(FEEDBACK_SCALE, FEEDBACK_SCALE);
        ctx.translate(-ox, -oy);
        ctx.globalAlpha = FEEDBACK_ALPHA;
        ctx.drawImage(prev, 0, 0, w, h);
        ctx.restore();

        drawMarks(ctx, g.cx, g.cy, g.R, nodes, clock.phase, 1);
        drawFires(ctx, FIRE_HOLD_MS);
        if (ghostOn) {
          ghostRot += rot; // it moves with the tunnel, and it stays
          drawGhost(ctx, ox, oy, gAngle * TAU + ghostRot, g.R);
        }
        ageFires(dt, FIRE_HOLD_MS);

        // this frame becomes the previous frame
        prevCtx.setTransform(1, 0, 0, 1, 0, 0);
        prevCtx.globalCompositeOperation = 'source-over';
        prevCtx.globalAlpha = 1;
        prevCtx.clearRect(0, 0, pw, ph);
        prevCtx.drawImage(ctx.canvas, 0, 0, pw, ph);

        // bounded accumulation: every N frames, clear the core that holds
        // everything older than N frames (0.94^N of the way to the centre)
        frames++;
        if (frames >= CLEAR_EVERY[tier]) {
          frames = 0;
          prevCtx.save();
          prevCtx.setTransform(prevDpr, 0, 0, prevDpr, 0, 0);
          prevCtx.globalCompositeOperation = 'destination-out';
          prevCtx.beginPath();
          prevCtx.arc(ox, oy, coreRadius(g.R, tier), 0, TAU);
          prevCtx.fill();
          prevCtx.restore();
        }
      }

      // ---- 3. depth, monotonic, at most once per 0.25 step ----------------
      const depth = depthFor(echoes > 0, leaned, ghostSeen);
      if (depth > depthRef.current) {
        depthRef.current = depth;
        p.onExplore({ name: 'depth_reached', section: p.id, depth });
      }

      // ---- the QA hook: written only when a milestone changes, never per frame
      const el = stateRef.current;
      if (el) {
        if (echoes !== shownEchoes) {
          shownEchoes = echoes;
          el.dataset.echoes = String(echoes);
        }
        if (leaned && !shownLean) {
          shownLean = true;
          el.dataset.lean = '1';
        }
        if (ghostSeen && !shownGhost) {
          shownGhost = true;
          el.dataset.ghost = '1';
        }
      }
    });

    // ---- 5. release everything ------------------------------------------
    return () => {
      unsubscribe();
      stage?.removeEventListener('pointermove', onMove);
      stage?.removeEventListener('pointerleave', onLeave);
      prev.width = 1;
      prev.height = 1;
    };
  }, [props.seed, props.reducedMotion]);

  // No visible DOM: the stage's canvas already carries the text equivalent.
  // The hidden span is a QA hook, like #stage[data-node-count] (WP0 note E.5).
  return <span ref={stateRef} hidden data-room="mirror" data-echoes="0" />;
}
