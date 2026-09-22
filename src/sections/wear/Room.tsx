'use client';

/**
 * src/sections/wear/Room.tsx — WEAR, the client half (§D.10).
 *
 * The turn. A scalar `vigor` starts at 1.0 and is multiplied by 0.94 on each
 * revolution while the room is active. Everything the room draws is dimmed and
 * desaturated toward --c-text-muted by 1 − vigor. Doing nothing never reaches
 * zero: vigor floors at 0.22 and the room stays legible. The only fix is
 * change — adding, moving or removing any node, including nudging one by a
 * single radius level — which lifts vigor to 1.15 with a 900 ms --ease-enter
 * overshoot and a full-circuit light sweep, then decays from 1.0 as before.
 *
 * Gentle by construction: there is no timer, no streak, no scarcity, and no
 * content is ever removed. The captions are `it's getting tired` (once, until
 * revived) and `better.` (2.5 s). Nothing else is ever said here.
 *
 * Reduced motion: vigor is expressed only as alpha and colour, each step a
 * 150 ms transition; the trail keeps its length and revival is an instant lift.
 *
 * Follows src/sections/_example/Room.tsx rule for rule. The hot path allocates
 * nothing: colours are mixed into a fixed buffer only when vigor changes, and
 * the gradients are cached with the geometry.
 */

import { useEffect, useRef } from 'react';
import { subscribeFrame } from '@/lib/clock';
import { isEnabled, setMasterGain } from '@/lib/audio';
import { pointAt, radiusOfLevel } from '@/lib/ring-geometry';
import { rgba, token } from '@/lib/tokens';
import type { RingNode, SectionProps } from '@/lib/types';
import {
  BETTER_MS,
  RESTED,
  REVIVE_MS,
  STEP_MS,
  SWEEP_CIRCUIT_MS,
  TIRED_AT,
  audioGain,
  bgAlpha,
  decayed,
  depthFor,
  parseRgb,
  reviveCurve,
  ringAlpha,
  trailTau,
} from './logic';
import styles from './room.module.css';

const HOOK = "it's getting tired";
const HOOK_MS = 3000;
const TIRED = "it's getting tired";
const BETTER = 'better.';
/** The ring's own trail τ (§C.2); under reduced motion the memory keeps this length. */
const FULL_TAU_MS = 380;
const TRAIL_SEGMENTS = 12;
const GRAIN_TICKS = 72;
const TAU = Math.PI * 2;

const FALLBACK_ACCENT: readonly [number, number, number] = [79, 233, 196];
const FALLBACK_HI: readonly [number, number, number] = [124, 243, 216];
const FALLBACK_MUTED: readonly [number, number, number] = [123, 134, 152];
const FALLBACK_BORDER: readonly [number, number, number] = [46, 55, 74];

/** Everything that must survive a reduced-motion re-run of the effect. */
interface WearState {
  vigor: number;
  display: number;
  from: number;
  to: number;
  animT: number;
  mode: 0 | 1 | 2; // 0 none, 1 step, 2 revive
  tired: boolean;
  tiredSeen: boolean;
  revived: boolean;
  minSeen: number;
  lastRev: number;
  lastNodes: readonly RingNode[] | null;
  sweepT: number; // -1 = off
  sweepStart: number;
}

export default function Room(props: SectionProps) {
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  const rootRef = useRef<HTMLDivElement | null>(null);
  const depthRef = useRef(0);
  const viewedRef = useRef(false);
  const hookRef = useRef(false);
  const stateRef = useRef<WearState | null>(null);

  useEffect(() => {
    const first = propsRef.current;
    const reduced = first.reducedMotion;
    const root = rootRef.current;
    const stage = document.getElementById('stage');

    if (!viewedRef.current) {
      viewedRef.current = true;
      first.onExplore({ name: 'section_viewed', section: first.id });
    }

    if (!stateRef.current) {
      stateRef.current = {
        vigor: RESTED,
        display: RESTED,
        from: RESTED,
        to: RESTED,
        animT: 0,
        mode: 0,
        tired: false,
        tiredSeen: false,
        revived: false,
        minSeen: RESTED,
        lastRev: first.clock.revolution,
        lastNodes: first.nodes,
        sweepT: -1,
        sweepStart: 0,
      };
    }
    const s = stateRef.current;

    // The hook line: once on entry, 3 s, dismissed by any input (§I.3).
    let hookUntil = 0;
    let hookTimer: ReturnType<typeof setTimeout> | null = null;
    if (!hookRef.current) {
      hookRef.current = true;
      // Deferred one task so it lands after the shell's own room-name caption.
      hookTimer = setTimeout(() => {
        hookTimer = null;
        first.say(HOOK, HOOK_MS);
        hookUntil = propsRef.current.clock.t + HOOK_MS;
      }, 0);
    } else if (s.tired) {
      first.say(TIRED);
    }
    function dismissHook(): void {
      if (hookUntil > 0 && propsRef.current.clock.t < hookUntil) first.say('');
      hookUntil = 0;
    }

    /* ---------------------------------------------------------- colours */

    const accent = parseRgb(token('--c-accent'), FALLBACK_ACCENT);
    const hi = parseRgb(token('--c-accent-hi'), FALLBACK_HI);
    const muted = parseRgb(token('--c-text-muted'), FALLBACK_MUTED);
    const border = parseRgb(token('--c-border-strong'), FALLBACK_BORDER);
    const mix = new Float64Array(9); // accent→muted, hi→muted, border→muted
    let mixedAt = -1;
    let cAccent = '';
    let cHi = '';
    let cBorder = '';

    function mixInto(o: number, a: readonly [number, number, number], t: number): void {
      mix[o] = a[0] + (muted[0] - a[0]) * t;
      mix[o + 1] = a[1] + (muted[1] - a[1]) * t;
      mix[o + 2] = a[2] + (muted[2] - a[2]) * t;
    }
    function str(o: number): string {
      return `rgb(${Math.round(mix[o]!)}, ${Math.round(mix[o + 1]!)}, ${Math.round(mix[o + 2]!)})`;
    }
    /** Re-mix only when the displayed vigor actually moved. */
    function remix(v: number): void {
      if (v === mixedAt) return;
      mixedAt = v;
      const t = 1 - Math.min(1, v);
      mixInto(0, accent, t);
      mixInto(3, hi, t);
      mixInto(6, border, t * 0.6);
      cAccent = str(0);
      cHi = str(3);
      cBorder = str(6);
    }

    /* ---------------------------------------------------------- gradients */

    let gradR = -1;
    let gradW = -1;
    let gradH = -1;
    let bgAccent: CanvasGradient | null = null;
    let bgMuted: CanvasGradient | null = null;
    let pool: CanvasGradient | null = null;

    function rebuildGradients(bg: CanvasRenderingContext2D, ctx: CanvasRenderingContext2D): void {
      const g = propsRef.current.geometry;
      gradR = g.R;
      gradW = g.w;
      gradH = g.h;
      bgAccent = bg.createRadialGradient(g.cx, g.cy, g.R * 0.15, g.cx, g.cy, g.R * 2);
      bgAccent.addColorStop(0, rgba('--c-accent', 1));
      bgAccent.addColorStop(1, rgba('--c-accent', 0));
      bgMuted = bg.createRadialGradient(g.cx, g.cy, g.R * 0.15, g.cx, g.cy, g.R * 2);
      bgMuted.addColorStop(0, rgba('--c-text-muted', 1));
      bgMuted.addColorStop(1, rgba('--c-text-muted', 0));
      pool = ctx.createRadialGradient(g.cx, g.h, 0, g.cx, g.h, g.R * 0.6);
      pool.addColorStop(0, rgba('--c-accent', 1));
      pool.addColorStop(1, rgba('--c-accent', 0));
    }

    /* ---------------------------------------------------------- state changes */

    function publish(): void {
      if (root) {
        root.dataset.vigor = s.vigor.toFixed(3);
        root.dataset.tired = String(s.tired);
      }
      if (isEnabled()) setMasterGain(audioGain(s.vigor), 200);
    }

    function step(): void {
      s.vigor = decayed(s.vigor);
      s.from = s.display;
      s.to = s.vigor;
      s.animT = 0;
      s.mode = 1;
      publish();
    }

    function revive(phase: number): void {
      s.vigor = RESTED;
      s.tired = false;
      s.revived = true;
      if (reduced) {
        // instant alpha lift, no sweep (§D.10 reduced motion)
        s.display = RESTED;
        s.mode = 0;
      } else {
        s.from = s.display;
        s.animT = 0;
        s.mode = 2;
        s.sweepT = 0;
        s.sweepStart = phase;
      }
      propsRef.current.say(BETTER, BETTER_MS);
      publish();
    }

    publish();

    /* ---------------------------------------------------------- draw */

    const unsubscribe = subscribeFrame(() => {
      const p = propsRef.current;
      if (!p.visible) return;
      const { ctx, bg, geometry: g, clock, nodes } = p;
      if (!ctx || !bg || g.R <= 0) return;
      const { w, h, cx, cy, R } = g;
      const dt = clock.dt;

      // --- one revolution of doing nothing costs 6%
      if (clock.revolution !== s.lastRev) {
        s.lastRev = clock.revolution;
        step();
      }
      // --- any change to the node set is the fix
      if (nodes !== s.lastNodes) {
        s.lastNodes = nodes;
        revive(clock.phase);
      }
      // --- the transitions
      if (s.mode === 1) {
        s.animT += dt;
        const k = Math.min(1, s.animT / STEP_MS);
        s.display = s.from + (s.to - s.from) * k;
        if (k >= 1) s.mode = 0;
      } else if (s.mode === 2) {
        s.animT += dt;
        const k = Math.min(1, s.animT / REVIVE_MS);
        s.display = reviveCurve(s.from, k);
        if (k >= 1) {
          s.display = RESTED;
          s.mode = 0;
        }
      }
      const v = s.display;
      const vm = Math.min(1, v);
      if (v < s.minSeen) s.minSeen = v;
      if (!s.tired && v < TIRED_AT) {
        s.tired = true;
        s.tiredSeen = true;
        p.say(TIRED);
        if (root) root.dataset.tired = 'true';
      }
      remix(v);

      if (g.R !== gradR || w !== gradW || h !== gradH) rebuildGradients(bg, ctx);

      // ---- background: gradient alpha = 0.04·vigor, colour mixed toward muted
      clear(bg);
      if (bgAccent && bgMuted) {
        bg.globalAlpha = bgAlpha(v) * vm;
        bg.fillStyle = bgAccent;
        bg.fillRect(0, 0, w, h);
        bg.globalAlpha = bgAlpha(v) * (1 - vm);
        bg.fillStyle = bgMuted;
        bg.fillRect(0, 0, w, h);
        bg.globalAlpha = 1;
      }

      // ---- room
      clear(ctx);
      ctx.lineCap = 'round';

      // wear grooves: the record of every turn, fading as the loop tires
      ctx.strokeStyle = cBorder;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.28 * (0.3 + 0.7 * vm);
      for (let l = 1; l <= 13; l += 2) {
        if (l === 7 || l === 9) continue;
        ctx.beginPath();
        ctx.arc(cx, cy, radiusOfLevel(l, R), 0, TAU);
        ctx.stroke();
      }
      // grain: fine ticks on the outer rim
      ctx.globalAlpha = 0.16 * vm + 0.04;
      ctx.beginPath();
      const r14 = radiusOfLevel(14, R);
      const r15 = radiusOfLevel(15, R);
      for (let i = 0; i < GRAIN_TICKS; i++) {
        const a = (i / GRAIN_TICKS) * TAU;
        const sn = Math.sin(a);
        const cs = -Math.cos(a);
        ctx.moveTo(cx + r14 * sn, cy + r14 * cs);
        ctx.lineTo(cx + r15 * sn, cy + r15 * cs);
      }
      ctx.stroke();

      // the ring's halo: stroke alpha = 0.35 + 0.5·vigor
      const ra = ringAlpha(v);
      ctx.strokeStyle = cAccent;
      ctx.lineWidth = 16;
      ctx.globalAlpha = ra * 0.05;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 7;
      ctx.globalAlpha = ra * 0.1;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.globalAlpha = ra * 0.3;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.stroke();

      // the turn so far: the arc the sweep has covered this revolution
      const start = -Math.PI / 2;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.12 * vm + 0.02;
      ctx.beginPath();
      if (clock.dir > 0) ctx.arc(cx, cy, R, start, start + clock.phase * TAU);
      else ctx.arc(cx, cy, R, start + clock.phase * TAU, start + TAU);
      ctx.stroke();

      // the memory: a trail whose length is the trail's τ — 380 ms at full,
      // 120 + 260·vigor when tired. Fixed length under reduced motion.
      const tau = reduced ? FULL_TAU_MS : trailTau(v);
      const trailTurns = tau / clock.periodMs;
      const rTrail = R * 0.985;
      ctx.strokeStyle = cHi;
      ctx.lineWidth = 3.5;
      for (let i = 0; i < TRAIL_SEGMENTS; i++) {
        const k0 = i / TRAIL_SEGMENTS;
        const k1 = (i + 1) / TRAIL_SEGMENTS;
        const a1 = start + (clock.phase - clock.dir * trailTurns * (1 - k1)) * TAU;
        const a0 = start + (clock.phase - clock.dir * trailTurns * (1 - k0)) * TAU;
        ctx.globalAlpha = 0.7 * vm * k1 * k1;
        ctx.beginPath();
        if (clock.dir > 0) ctx.arc(cx, cy, rTrail, a0, a1);
        else ctx.arc(cx, cy, rTrail, a1, a0);
        ctx.stroke();
      }

      // node glow: alpha = vigor
      ctx.fillStyle = cHi;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (!n) continue;
        const q = pointAt(n.a, n.r, g);
        ctx.globalAlpha = 0.16 * vm;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 26, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 0.55 * vm;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 10, 0, TAU);
        ctx.fill();
      }

      // the revival: one full-circuit light sweep over --dur-7
      if (s.sweepT >= 0) {
        s.sweepT += dt;
        const k = s.sweepT / SWEEP_CIRCUIT_MS;
        if (k >= 1) {
          s.sweepT = -1;
        } else {
          const a0 = start + (s.sweepStart + clock.dir * k) * TAU;
          const len = 0.16 * TAU * clock.dir;
          ctx.strokeStyle = rgba('--c-accent-hi', 1);
          ctx.lineWidth = 12;
          ctx.globalAlpha = 0.22 * (1 - k * 0.6);
          ctx.beginPath();
          if (clock.dir > 0) ctx.arc(cx, cy, R, a0 - len, a0);
          else ctx.arc(cx, cy, R, a0, a0 - len);
          ctx.stroke();
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.9 * (1 - k * 0.6);
          ctx.beginPath();
          if (clock.dir > 0) ctx.arc(cx, cy, R, a0 - len, a0);
          else ctx.arc(cx, cy, R, a0, a0 - len);
          ctx.stroke();
        }
      }

      // next affordance: the revived loop is bright enough to light the arc
      if (pool) {
        const lit = Math.max(0, (v - TIRED_AT) / (RESTED - TIRED_AT));
        ctx.globalAlpha = 0.2 * Math.min(1.15, lit);
        ctx.fillStyle = pool;
        ctx.fillRect(cx - R, h - R * 0.6, R * 2, R * 0.6);
      }
      ctx.globalAlpha = 1;

      // ---- depth, monotonic, at most once per 0.25 step
      const depth = depthFor(s.minSeen, s.tiredSeen, s.revived);
      if (depth > depthRef.current) {
        depthRef.current = depth;
        p.onExplore({ name: 'depth_reached', section: p.id, depth });
      }
    });

    /* ---------------------------------------------------------- input */

    // The room has no gestures of its own: ↑/↓ (a one-level nudge), Space,
    // Delete and every pointer gesture already belong to the ring, and any of
    // them is the fix. Input here only dismisses the hook.
    stage?.addEventListener('pointerdown', dismissHook);
    stage?.addEventListener('keydown', dismissHook);

    return () => {
      unsubscribe();
      if (hookTimer) clearTimeout(hookTimer);
      stage?.removeEventListener('pointerdown', dismissHook);
      stage?.removeEventListener('keydown', dismissHook);
      if (s.tired) propsRef.current.say('');
      if (isEnabled()) setMasterGain(audioGain(RESTED), 40);
    };
  }, [props.seed, props.reducedMotion]);

  // A room-owned, invisible, inert element: it carries vigor for QA
  // (data-vigor, data-tired) and nothing else. The canvas is the room.
  return <div ref={rootRef} className={styles.root} aria-hidden="true" data-room="wear" />;
}

/** Clear a layer in device pixels, leaving the CSS-pixel transform intact. */
function clear(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}
