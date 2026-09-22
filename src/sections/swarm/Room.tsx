'use client';

/**
 * src/sections/swarm/Room.tsx — SWARM (§D.5): they follow it.
 *
 * 200 / 120 / 60 boids (by tier) take the loop as a heartbeat. Every node
 * fire injects an attractor at the node's screen position, and the flock
 * visibly lunges on the beat. The pointer is a weak repulsor on desktop; a
 * touch tap emits a one-shot repulse pulse. At revolution >= 6 in-room the
 * flock resolves into an arrow pointing at the Next Arc for 1.5 s.
 *
 * Follows src/sections/_example/Room.tsx to the letter: one effect keyed on
 * [seed, reducedMotion], one subscribeFrame callback, props read through a
 * ref, no rAF, no matchMedia, no localStorage, no mutation of `nodes`.
 *
 * NOTHING ALLOCATES IN THE FRAME CALLBACK. The flock lives in pre-allocated
 * typed arrays (logic.ts); positions are computed inline (pointAt returns an
 * object); palette strings are resolved once per revolution (rgba builds a
 * string); the glow gradient is created once and drawn under a transform.
 */

import { useEffect, useRef } from 'react';
import { subscribeFrame } from '@/lib/clock';
import { radiusOfLevel } from '@/lib/ring-geometry';
import { rgba } from '@/lib/tokens';
import { hashSeed, mulberry32 } from '@/lib/rng';
import type { SectionProps } from '@/lib/types';
import {
  AGENTS_BY_TIER,
  ARROW_MS,
  ATTRACT_STRENGTH,
  MAX_AGENTS,
  NEAREST_ACCENT,
  NUDGE_COUNT,
  NUDGE_MS,
  NUDGE_PX,
  PULSE_SLOTS,
  TAP_REPEL_RADIUS,
  TAP_REPEL_STRENGTH,
  addPulse,
  agePulses,
  arrowDue,
  createArrow,
  createFlock,
  createPulses,
  depthFor,
  layoutArrow,
  layoutFormation,
  nearestK,
  seedFlock,
  stepFlock,
  stillAlpha,
  wrapFlock,
} from './logic';

const TAU = Math.PI * 2;
/** the agent comet trails on the background layer (§E decay recipe) */
const TRAIL_TAU_MS = 420;
/** the beat ring that expands from a fired node */
const RING_PULSE_MS = 600;
/** reduced motion: the still ring flash at a fired node */
const STILL_RING_MS = 360;
const AGENT_PX = 3;
/** the still formation spans this much of the short axis */
const FORMATION_SPAN = 0.62;

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

    const rnd = mulberry32(Math.floor(hashSeed(first.seed, 'swarm') * 0x7fffffff));
    const flock = createFlock();
    const pulses = createPulses();
    const arrow = createArrow();
    const nearIdx = new Int32Array(NUDGE_COUNT);
    const nearD2 = new Float32Array(NUDGE_COUNT);
    const nudgeAge = new Float32Array(MAX_AGENTS).fill(-1);
    const nudgeX = new Float32Array(MAX_AGENTS);
    const nudgeY = new Float32Array(MAX_AGENTS);

    let fieldW = 0;
    let fieldH = 0;
    let fieldR = 0;
    let laidOut = 0;
    let pointerOn = false;
    let pointerX = 0;
    let pointerY = 0;
    let lunges = 0;
    let interacted = false;
    let arrowSeen = false;
    let lastRev = startRev;
    let lastRevHere = -1;
    let bgStill = false;
    let glowRoom: CanvasGradient | null = null;
    let glowBg: CanvasGradient | null = null;
    let shownLunges = -1;
    let shownAgents = -1;
    let shownArrow = false;
    let shownPointer = false;

    // Palette strings, resolved once and refreshed once per revolution so a
    // theme change is picked up without building strings every frame.
    let cAgent = '';
    let cAccent = '';
    let cDim = '';
    let cEmber = '';
    let cCanvas = '';
    function palette(): void {
      cAgent = rgba('--c-text-secondary', 1);
      cAccent = rgba('--c-accent', 1);
      cDim = rgba('--c-accent-dim', 1);
      cEmber = rgba('--c-accent-3', 1);
      cCanvas = rgba('--c-canvas', 1);
    }
    palette();

    function makeGlow(c: CanvasRenderingContext2D): CanvasGradient {
      const grad = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      grad.addColorStop(0, rgba('--c-accent', 0.55));
      grad.addColorStop(0.35, rgba('--c-accent', 0.18));
      grad.addColorStop(1, rgba('--c-accent', 0));
      return grad;
    }

    /** Heading scratch, written by `heading` — no per-agent allocation. */
    let hx = 0;
    let hy = -1;
    function heading(vx: number, vy: number): void {
      const m = Math.hypot(vx, vy);
      if (m < 1e-4) {
        hx = 0;
        hy = -1;
      } else {
        hx = vx / m;
        hy = vy / m;
      }
    }

    /** Append one agent triangle (oriented to velocity) to the current path. */
    function tri(c: CanvasRenderingContext2D, x: number, y: number, s: number): void {
      const nx = -hy * s * 0.7;
      const ny = hx * s * 0.7;
      c.moveTo(x + hx * s * 1.4, y + hy * s * 1.4);
      c.lineTo(x - hx * s + nx, y - hy * s + ny);
      c.lineTo(x - hx * s - nx, y - hy * s - ny);
      c.closePath();
    }

    function clear(c: CanvasRenderingContext2D): void {
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, c.canvas.width, c.canvas.height);
      c.restore();
    }

    function glowAt(c: CanvasRenderingContext2D, grad: CanvasGradient, x: number, y: number, r: number, alpha: number): void {
      c.save();
      c.translate(x, y);
      c.scale(r, r);
      c.globalAlpha = alpha;
      c.fillStyle = grad;
      c.fillRect(-1, -1, 2, 2);
      c.restore();
    }

    // ---- pointer: repulsor on desktop, repulse pulse on touch ------------
    const stage = document.getElementById('stage');
    function localise(e: PointerEvent): void {
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      pointerX = e.clientX - rect.left;
      pointerY = e.clientY - rect.top;
    }
    function onMove(e: PointerEvent): void {
      if (e.pointerType === 'touch') return;
      localise(e);
      pointerOn = true;
      interacted = true;
    }
    function onLeave(): void {
      pointerOn = false;
    }
    function onDown(e: PointerEvent): void {
      interacted = true;
      if (e.pointerType !== 'touch') return;
      localise(e);
      addPulse(pulses, pointerX, pointerY, -TAP_REPEL_STRENGTH, TAP_REPEL_RADIUS);
    }
    stage?.addEventListener('pointermove', onMove, { passive: true });
    stage?.addEventListener('pointerleave', onLeave, { passive: true });
    stage?.addEventListener('pointerdown', onDown, { passive: true });

    // ---- 2. one draw callback, registered with the shared clock ----------
    const unsubscribe = subscribeFrame(() => {
      const p = propsRef.current;
      if (!p.visible) return;
      const { ctx, bg, geometry: g, clock, fired, reducedMotion, tier } = p;
      if (!ctx || !bg || g.R <= 0 || g.w <= 0 || g.h <= 0) return;

      const w = g.w;
      const h = g.h;
      const dt = clock.dt;
      const revHere = clock.revolution - startRev;
      if (clock.revolution !== lastRev) {
        lastRev = clock.revolution;
        palette();
      }
      if (!glowRoom) glowRoom = makeGlow(ctx);
      if (!glowBg) glowBg = makeGlow(bg);

      // Tier only ever reduces work: 200 / 120 / 60 agents.
      const n = AGENTS_BY_TIER[tier];

      if (reducedMotion) {
        /* ================= the still: a flock frozen mid-circuit ============ */
        if (n !== laidOut || w !== fieldW || h !== fieldH || g.R !== fieldR) {
          layoutFormation(flock, n, g.cx, g.cy, Math.min(w, h) * FORMATION_SPAN);
          laidOut = n;
          fieldW = w;
          fieldH = h;
          fieldR = g.R;
          bgStill = false;
        }
        if (!bgStill) {
          bgStill = true;
          clear(bg);
          glowAt(bg, glowBg, g.cx, g.cy, g.R * 1.9, 0.12);
        }

        // node fires nudge the nearest 12 agents by <= 2 px over 150 ms
        for (let k = 0; k < fired.length; k++) {
          const ev = fired[k];
          if (!ev) continue;
          const rho = radiusOfLevel(ev.node.r, g.R);
          const t = ev.node.a * TAU;
          const x = g.cx + rho * Math.sin(t);
          const y = g.cy - rho * Math.cos(t);
          const found = nearestK(flock, x, y, NUDGE_COUNT, nearIdx, nearD2);
          for (let q = 0; q < found; q++) {
            const i = nearIdx[q]!;
            const d = Math.sqrt(nearD2[q]!);
            nudgeAge[i] = 0;
            nudgeX[i] = d > 1e-3 ? (x - flock.px[i]!) / d : 0;
            nudgeY[i] = d > 1e-3 ? (y - flock.py[i]!) / d : 0;
          }
          addPulse(pulses, x, y, ATTRACT_STRENGTH, 0);
          lunges++;
        }
        agePulses(pulses, dt);

        clear(ctx);

        // a still ring at each fired node, fading over one reduced step
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = cEmber;
        for (let k = 0; k < PULSE_SLOTS; k++) {
          if (pulses.s[k]! <= 0) continue;
          const age = pulses.age[k]!;
          if (age > STILL_RING_MS) continue;
          ctx.globalAlpha = 0.7 * (1 - age / STILL_RING_MS);
          ctx.beginPath();
          ctx.arc(pulses.x[k]!, pulses.y[k]!, 18, 0, TAU);
          ctx.stroke();
        }

        // the flock: opacity pulses 0.55 <-> 0.85 over 12 s, phase offsets i/n
        const count = flock.n;
        ctx.fillStyle = cAgent;
        ctx.strokeStyle = cAgent;
        ctx.lineWidth = 1;
        for (let i = 0; i < count; i++) {
          let x = flock.px[i]!;
          let y = flock.py[i]!;
          const age = nudgeAge[i]!;
          if (age >= 0) {
            const k = age / NUDGE_MS;
            const amt = k < 1 ? k : Math.max(0, 2 - k);
            x += nudgeX[i]! * NUDGE_PX * amt;
            y += nudgeY[i]! * NUDGE_PX * amt;
            const next = age + dt;
            nudgeAge[i] = next > NUDGE_MS * 2 ? -1 : next;
          }
          const alpha = stillAlpha(clock.t, i, count);
          heading(flock.vx[i]!, flock.vy[i]!);
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          tri(ctx, x, y, AGENT_PX + 0.2);
          ctx.fill();
          // a short frozen streak behind each agent: motion, held
          ctx.globalAlpha = alpha * 0.35;
          ctx.beginPath();
          ctx.moveTo(x - hx * 4, y - hy * 4);
          ctx.lineTo(x - hx * 11, y - hy * 11);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else {
        /* ================= the flock, alive ================================= */
        if (laidOut === 0 || fieldW === 0) {
          seedFlock(flock, n, w, h, rnd);
          laidOut = n;
        } else if (n < flock.n) {
          flock.n = n; // a tier drop simply retires the tail
          laidOut = n;
        }
        if (w !== fieldW || h !== fieldH) {
          fieldW = w;
          fieldH = h;
          wrapFlock(flock, w, h);
        }

        // ---- background: comet trails, exponential decay, frame-rate independent
        bg.save();
        bg.setTransform(1, 0, 0, 1, 0, 0);
        bg.globalCompositeOperation = 'destination-out';
        bg.globalAlpha = 1 - Math.exp(-dt / TRAIL_TAU_MS);
        bg.fillStyle = cCanvas;
        bg.fillRect(0, 0, bg.canvas.width, bg.canvas.height);
        bg.restore();

        // ---- the heartbeat: every fire is an attractor and a bloom of light
        for (let k = 0; k < fired.length; k++) {
          const ev = fired[k];
          if (!ev) continue;
          const rho = radiusOfLevel(ev.node.r, g.R);
          const t = ev.node.a * TAU;
          const x = g.cx + rho * Math.sin(t);
          const y = g.cy - rho * Math.cos(t);
          addPulse(pulses, x, y, ATTRACT_STRENGTH, 0);
          glowAt(bg, glowBg, x, y, 72, 0.7);
          lunges++;
        }
        const beat = agePulses(pulses, dt);

        // ---- the arrow: at revolution 6 (and every 6th after) the flock points at the Next Arc
        if (revHere !== lastRevHere) {
          lastRevHere = revHere;
          if (arrowDue(revHere)) {
            let toX = g.cx;
            let toY = h;
            const arc = document.querySelector('.next-arc');
            if (arc && stage) {
              const a = arc.getBoundingClientRect();
              const s = stage.getBoundingClientRect();
              toX = a.left + a.width / 2 - s.left;
              toY = a.top + a.height / 2 - s.top;
            }
            layoutArrow(arrow, flock.n, g.cx, g.cy, toX, toY, g.R);
            arrowSeen = true;
          }
        }
        if (arrow.active) {
          arrow.age += dt;
          if (arrow.age >= ARROW_MS) arrow.active = false;
        }

        stepFlock(flock, dt, w, h, pulses, pointerOn, pointerX, pointerY, arrow, beat);

        // the 8 agents nearest the pointer wear the accent
        const count = flock.n;
        flock.near.fill(0, 0, count);
        let nearCount = 0;
        if (pointerOn) {
          nearCount = nearestK(flock, pointerX, pointerY, NEAREST_ACCENT, nearIdx, nearD2);
          for (let q = 0; q < nearCount; q++) flock.near[nearIdx[q]!] = 1;
        }

        // ---- trails: one additive dot per agent, decayed by the recipe above
        bg.globalCompositeOperation = 'lighter';
        bg.globalAlpha = 0.16 + 0.34 * beat;
        bg.fillStyle = cDim;
        bg.beginPath();
        for (let i = 0; i < count; i++) {
          const x = flock.px[i]!;
          const y = flock.py[i]!;
          bg.moveTo(x + 1.3, y);
          bg.arc(x, y, 1.3, 0, TAU);
        }
        bg.fill();
        bg.globalCompositeOperation = 'source-over';
        bg.globalAlpha = 1;

        // ---- room layer
        clear(ctx);

        // the beat, made visible: a ring expanding from each fired node
        ctx.strokeStyle = cAccent;
        for (let k = 0; k < PULSE_SLOTS; k++) {
          const s = pulses.s[k]!;
          if (s === 0) continue;
          const age = pulses.age[k]!;
          if (age > RING_PULSE_MS) continue;
          const kk = age / RING_PULSE_MS;
          const ease = 1 - (1 - kk) * (1 - kk);
          ctx.globalAlpha = (s > 0 ? 0.55 : 0.3) * (1 - kk);
          ctx.lineWidth = 2 - kk;
          ctx.beginPath();
          ctx.arc(pulses.x[k]!, pulses.y[k]!, 8 + (s > 0 ? 56 : 110) * ease, 0, TAU);
          ctx.stroke();
        }

        // the flock: 3 px triangles oriented to velocity, brighter on the beat
        ctx.fillStyle = cAgent;
        ctx.globalAlpha = 0.45 + 0.3 * beat;
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
          if (flock.near[i]) continue;
          heading(flock.vx[i]!, flock.vy[i]!);
          tri(ctx, flock.px[i]!, flock.py[i]!, AGENT_PX);
        }
        ctx.fill();
        if (nearCount > 0) {
          ctx.fillStyle = cAccent;
          ctx.globalAlpha = 0.95;
          ctx.beginPath();
          for (let q = 0; q < nearCount; q++) {
            const i = nearIdx[q]!;
            heading(flock.vx[i]!, flock.vy[i]!);
            tri(ctx, flock.px[i]!, flock.py[i]!, AGENT_PX + 0.6);
          }
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // ---- 3. depth, monotonic, at most once per 0.25 step ----------------
      const depth = depthFor(lunges > 0, interacted, arrowSeen);
      if (depth > depthRef.current) {
        depthRef.current = depth;
        p.onExplore({ name: 'depth_reached', section: p.id, depth });
      }

      // ---- the QA hook: written only when a milestone changes, never per frame
      const el = stateRef.current;
      if (el) {
        if (lunges !== shownLunges) {
          shownLunges = lunges;
          el.dataset.lunges = String(lunges);
        }
        if (flock.n !== shownAgents) {
          shownAgents = flock.n;
          el.dataset.agents = String(flock.n);
        }
        if (arrowSeen && !shownArrow) {
          shownArrow = true;
          el.dataset.arrow = '1';
        }
        if (interacted && !shownPointer) {
          shownPointer = true;
          el.dataset.pointer = '1';
        }
      }
    });

    // ---- 5. release everything ------------------------------------------
    return () => {
      unsubscribe();
      stage?.removeEventListener('pointermove', onMove);
      stage?.removeEventListener('pointerleave', onLeave);
      stage?.removeEventListener('pointerdown', onDown);
    };
  }, [props.seed, props.reducedMotion]);

  // No visible DOM: the stage's canvas already carries the text equivalent.
  // The hidden span is a QA hook, like #stage[data-node-count] (WP0 note E.5).
  return <span ref={stateRef} hidden data-room="swarm" data-lunges="0" data-agents="0" />;
}
