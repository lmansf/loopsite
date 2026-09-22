'use client';

/**
 * src/components/ring/RingStage.tsx — the persistent ring. Owned by WP1.
 *
 * Spec: design/05-build-spec.md §B, §C.1–C.3, §F.6; design/06-wp0-notes.md.
 *
 * RingStage mounts ONCE, outside the room switch, and is never unmounted,
 * keyed or remounted by navigation: the phase and the node set survive every
 * transition. Rooms draw on the background and room layers only — the ring
 * layer belongs here, and rooms never touch it.
 *
 * What lives here:
 *   - the CSS ring that exists before React (`.rf`, painted from the geometry
 *     mirrors the inline bootstrap wrote) and the handover to the canvas ring
 *     on its first frame, with the rendered head easing onto the clock's phase
 *     instead of jumping (the clock cannot be moved; only the rendered lead/lag
 *     offset can, §C.2);
 *   - the sweep head with its glow and comet trail. The trail is a polyline of
 *     recent head positions whose alpha is `0.85 · exp(−age / 380 ms)`: the
 *     same exponential decay as §C.2's recipe, frame-rate independent, capped
 *     at 140 px, composited `lighter` — without a full-viewport fill and blit
 *     every frame (06-wp0-notes A.4 lets WP1 change the implementation);
 *   - the site's seed node (not in the store — see ring-state.ts), pulsing on
 *     every pass, grabbable, promoted into the store the moment it is touched;
 *   - nodes: place on pointerdown (<100 ms), grab within 22 px, drag to retime
 *     or re-level, flick past 1.45 R at >0.6 px/ms to remove (240 ms dissolve),
 *     the 24-node Ember rim flash, placement bloom + ripple, fire bloom + glow +
 *     trail flare, pointer-proximity swell (spring) and head slowing;
 *   - the ghost-node self-demo at 6 s and 14 s, cancelled forever by any real
 *     input, never a third;
 *   - the keyboard equivalents that belong to the ring (§C.12): Space, ↑/↓,
 *     Delete/Backspace. Corridor keys are AppShell's.
 *
 * The frame driver runs at priority −1000 so `fired[]` is filled before any
 * room's draw callback on the same frame.
 */

import { useEffect, useRef } from 'react';
import { getFrame, mod1, subscribeFrame, SWEEP_MS } from '@/lib/clock';
import {
  addNode,
  computeFires,
  getNodes,
  MAX_NODES,
  moveNode,
  removeNode,
  subscribeNodes,
} from '@/lib/ring-store';
import { angleAt, computeGeometry, isOnBand, LEVEL_STEP, levelAt, pointAt } from '@/lib/ring-geometry';
import { readUrlState } from '@/lib/url-state';
import { dprFor, sizeCanvas } from '@/lib/use-canvas';
import { rgba } from '@/lib/tokens';
import type { ClockFrame, FireEvent, RingGeometry, RingNode } from '@/lib/types';
import { bySlug } from '@/sections/registry';
import { useLoop } from '../shell/LoopContext';
import { engageHero } from '../hero/engage';
import { DOOR_GAP_TURN, getSeed, hasRingDoor, SEED_A, SEED_ALPHA, SEED_R, setSeed } from './ring-state';

/* ------------------------------------------------------------------ constants */

/** §C.2: the comet trail's decay constant. */
const TRAIL_TAU_MS = 380;
/** §C.2: trail length clamp, in px along the ring. */
const TRAIL_MAX_PX = 140;
/** §C.3: grab radius around an existing node. */
const GRAB_PX = 22;
/** §C.3: flick-to-remove — release beyond 1.45 R faster than 0.6 px/ms. */
const FLICK_RADIUS = 1.45;
const FLICK_SPEED = 0.6;
/** §C.3: removal dissolve. */
const DISSOLVE_MS = 240;
/** §B: fire bloom (--dur-4) and placement bloom / ripple (--dur-6). */
const BLOOM_MS = 240;
const PLACE_MS = 180;
const RIPPLE_MS = 520;
/** §C.3: the 25th tap flashes the rim in Ember for 240 ms. */
const RIM_FLASH_MS = 240;
/** §B: the ghost-node self-demo. */
const GHOST_FIRST_MS = 6000;
const GHOST_SECOND_MS = 14000;
const GHOST_FADE_IN = 400;
const GHOST_FADE_OUT = 800;
const GHOST_ALPHA = 0.45;
/** §C.2: pointer-proximity. */
const SWELL_PX = 180;
const SWELL_SCALE = 1.45;
const SLOW_PX = 90;
const SLOW_MAX_MS = 600;
const SLOW_RATE = 0.35;
const SLOW_MAX_OFFSET = 0.02;
const RECONVERGE_MS = 500;
/** The rendered head may lag/lead the clock by at most this fast while re-converging. */
const HANDOVER_MAX_RATE = 0.15; // rev per second
const FLARE_MS = 240;
const NODE_R = 6;
const NODE_ALPHA = 0.8;

/* ------------------------------------------------------------------ helpers */

/** `--ease-loop` cubic-bezier(.65,0,.35,1) is ease-in-out cubic. */
function easeLoop(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
/** `--ease-enter` cubic-bezier(.16,1,.3,1): a fast-out, long-settle curve. */
function easeEnter(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.pow(1 - t, 5);
}
/** `--ease-exit` cubic-bezier(.7,0,.84,0): ease-in. */
function easeExit(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * t;
}
/** A signed shortest distance between two turns, in (−0.5, 0.5]. */
function turnDelta(from: number, to: number): number {
  const d = mod1(to - from);
  return d > 0.5 ? d - 1 : d;
}
/** §C.3's crossing test for a single angle. */
function crossed(p0: number, p1: number, dir: 1 | -1, a: number): boolean {
  if (p0 === p1) return false;
  const travelled = Math.min(1, dir > 0 ? mod1(p1 - p0) : mod1(p0 - p1));
  const behind = dir > 0 ? mod1(p1 - a) : mod1(a - p1);
  return behind < travelled;
}

interface Pulse {
  age: number;
  kind: 'fire' | 'place';
}
interface Ripple {
  x: number;
  y: number;
  age: number;
}
interface Dissolve {
  x: number;
  y: number;
  age: number;
}
interface Swell {
  s: number;
  v: number;
}
interface TrailPt {
  x: number;
  y: number;
  t: number;
  flare: number;
}
interface Ghost {
  a: number;
  age: number;
  fired: boolean;
  fireAge: number;
  gone: boolean;
  cancelled: boolean;
}
interface Sample {
  x: number;
  y: number;
  t: number;
}

/** State that must survive an effect re-run (the `heavy` flag flips per room). */
interface Persist {
  live: boolean;
  interacted: boolean;
  ghostsDone: number;
  ghostFires: number;
  firstGhostA: number;
  refused: number;
  lastLevel: number;
  seedPresent: boolean;
  bootAdopted: boolean;
}

/** The bootstrap's record, beyond what beacon.ts declares (plus two QA hooks). */
interface BootExtra {
  tap?: boolean;
  taps?: Array<{ x: number; y: number }>;
  t0?: number;
  /** the live clock frame, for tests that measure in clock time */
  frame?: ClockFrame;
  /** the most recent fire: clock time and how late the sweep was, in ms */
  lastFire?: { id: string; t: number; lateness: number };
}

/* ------------------------------------------------------------------ component */

export function RingStage({ heavy = false, onGeometry }: { heavy?: boolean; onGeometry?: () => void }) {
  const loop = useLoop();
  const bgRef = useRef<HTMLCanvasElement | null>(null);
  const roomRef = useRef<HTMLCanvasElement | null>(null);
  const ringRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const loopRef = useRef(loop);
  const onGeometryRef = useRef(onGeometry);
  useEffect(() => {
    loopRef.current = loop;
    onGeometryRef.current = onGeometry;
  });

  // Created once, mutated in place from inside the effect only.
  const stRef = useRef<Persist>({
    live: false,
    interacted: false,
    ghostsDone: 0,
    ghostFires: 0,
    firstGhostA: 0,
    refused: 0,
    lastLevel: SEED_R,
    seedPresent: true,
    bootAdopted: false,
  });

  useEffect(() => {
    const st = stRef.current;
    const stage = stageRef.current;
    const bgCanvas = bgRef.current;
    const roomCanvas = roomRef.current;
    const ringCanvas = ringRef.current;
    if (!stage || !bgCanvas || !roomCanvas || !ringCanvas) return;

    const runtime = loopRef.current.runtime;
    const html = document.documentElement;
    const boot = window.__loop as (NonNullable<typeof window.__loop> & BootExtra) | undefined;

    let ringCtx: CanvasRenderingContext2D | null = null;
    let geometry: RingGeometry = computeGeometry(0, 0, false);
    let nodes: readonly RingNode[] = getNodes();

    const pulses = new Map<string, Pulse>();
    const swells = new Map<string, Swell>();
    const ripples: Ripple[] = [];
    const dissolves: Dissolve[] = [];
    const trail: TrailPt[] = [];
    const fired: FireEvent[] = [];
    let seedPulse = Infinity;
    const seedSwell: Swell = { s: 1, v: 0 };
    let rimFlash = 0;
    let flare = 0;
    let prevPhase = getFrame().phase;
    let ghost: Ghost | null = null;

    // the rendered head's lead/lag offset (§C.2) — the clock is never touched
    let offset = 0;
    let converge: { from: number; t: number; dur: number } | null = null;
    let slowMs = 0;
    let slowing = false;

    // pointer + drag
    const pointer = { x: 0, y: 0, active: false };
    let dragId: string | null = null;
    let dragPointer = -1;
    let dragA = 0;
    let dragLevel = SEED_R;
    const samples: Sample[] = [];

    /* ---------------------------------------------------------- sizing */

    function resize(): void {
      const w = stage!.clientWidth || window.innerWidth;
      const h = stage!.clientHeight || window.innerHeight;
      const coarse =
        typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: coarse)').matches : false;
      const ringDpr = dprFor(w, h, false);
      const roomDpr = dprFor(w, h, heavy);

      ringCtx = sizeCanvas(ringCanvas!, w, h, ringDpr);
      runtime.bg = sizeCanvas(bgCanvas!, w, h, roomDpr);
      runtime.ctx = sizeCanvas(roomCanvas!, w, h, roomDpr);

      geometry = computeGeometry(w, h, coarse);
      geometry.dpr = ringDpr;
      runtime.geometry = geometry;
      trail.length = 0;

      // CSS mirrors, so the caption and the CSS ring sit under the same centre.
      const s = html.style;
      s.setProperty('--ring-r', `${geometry.R}px`);
      s.setProperty('--ring-cx', `${geometry.cx}px`);
      s.setProperty('--ring-cy', `${geometry.cy}px`);
      onGeometryRef.current?.();
    }

    resize();
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 100);
    });
    ro.observe(stage);

    const unsubNodes = subscribeNodes((n) => {
      nodes = n;
      runtime.nodes = n;
    });
    runtime.nodes = nodes;

    /* ---------------------------------------------------------- input state */

    function markInteracted(): void {
      if (st.interacted) return;
      st.interacted = true;
      if (ghost && !ghost.gone) ghost.cancelled = true; // any real input cancels the schedule for good
      stage!.dataset.ghost = 'off';
      engageHero();
    }

    /* ---------------------------------------------------------- adopting the bootstrap */

    /**
     * Runs on the FIRST FRAME, not in the effect body: child effects run before
     * parent effects, so a node added during mount would be emitted before
     * AppShell has subscribed to the store and `data-node-count` would miss it.
     */
    function adoptBootstrap(): void {
      st.bootAdopted = true;
      // A shared link populates the ring (§C.7); the site's seed steps aside.
      if (readUrlState().loopCode || nodes.length > 0) {
        st.seedPresent = false;
        setSeed(null);
      }
      if (boot) {
        boot.frame = getFrame();
        if (boot.tap) markInteracted();
        const rect = stage!.getBoundingClientRect();
        for (const tap of boot.taps ?? []) {
          const x = tap.x - rect.left;
          const y = tap.y - rect.top;
          if (!isOnBand(x, y, geometry)) continue;
          const node = addNode(angleAt(x, y, geometry), levelAt(x, y, geometry));
          if (!node) break;
          pulses.set(node.id, { age: 0, kind: 'place' });
          st.lastLevel = node.r;
        }
        if (boot.taps) boot.taps = [];
      }
      stage!.dataset.ghostFires = String(st.ghostFires);
      stage!.dataset.ghost = st.interacted ? 'off' : 'idle';
      stage!.dataset.refused = String(st.refused);
    }

    /* ---------------------------------------------------------- drawing */

    function glow(
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      r: number,
      k: number,
      tone: string,
      wide: string,
    ): void {
      // the --glow-full recipe, in canvas: 8 px @55%, 28 px @32%, 72 px @18% (Ion)
      if (k <= 0.01) return;
      const g1 = ctx.createRadialGradient(x, y, r * 0.6, x, y, r + 8);
      g1.addColorStop(0, rgba(tone, 0.55 * k));
      g1.addColorStop(1, rgba(tone, 0));
      ctx.fillStyle = g1;
      ctx.beginPath();
      ctx.arc(x, y, r + 8, 0, Math.PI * 2);
      ctx.fill();
      const g2 = ctx.createRadialGradient(x, y, r, x, y, r + 28);
      g2.addColorStop(0, rgba(tone, 0.32 * k));
      g2.addColorStop(1, rgba(tone, 0));
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(x, y, r + 28, 0, Math.PI * 2);
      ctx.fill();
      if (k > 0.5) {
        const g3 = ctx.createRadialGradient(x, y, r + 8, x, y, r + 72);
        g3.addColorStop(0, rgba(wide, 0.18 * (k - 0.5) * 2));
        g3.addColorStop(1, rgba(wide, 0));
        ctx.fillStyle = g3;
        ctx.beginPath();
        ctx.arc(x, y, r + 72, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    function ringStroke(ctx: CanvasRenderingContext2D, dt: number): void {
      const { cx, cy, R } = geometry;
      const door = hasRingDoor();
      const half = DOOR_GAP_TURN / 2;
      const top = -Math.PI / 2;

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = rgba('--c-border-strong', 1);
      ctx.beginPath();
      if (door) {
        ctx.arc(cx, cy, R, top + half * Math.PI * 2, top - half * Math.PI * 2 + Math.PI * 2);
      } else {
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
      }
      ctx.stroke();

      // the inner accent track at 12%
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba('--c-accent', 0.12);
      ctx.beginPath();
      ctx.arc(cx, cy, R - 4, 0, Math.PI * 2);
      ctx.stroke();

      if (door) {
        // the threshold: a 2 px --c-accent-hi line across the gap, with a soft glow
        const a = pointAt(1 - half, 8, geometry);
        const b = pointAt(half, 8, geometry);
        ctx.save();
        ctx.shadowColor = rgba('--c-accent-hi', 0.6);
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = rgba('--c-accent-hi', 0.95);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.restore();
      }

      if (rimFlash > 0) {
        // 25th tap: one Ember flash of the rim, 240 ms, no copy (§C.3, §J.6)
        const k = rimFlash / RIM_FLASH_MS;
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = rgba('--c-accent-3', 0.9 * k);
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 10;
        ctx.strokeStyle = rgba('--c-accent-3', 0.18 * k);
        ctx.stroke();
        rimFlash = Math.max(0, rimFlash - dt);
      }
    }

    function drawTrail(ctx: CanvasRenderingContext2D, now: number): void {
      if (trail.length < 2) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'butt';
      let len = 0;
      for (let i = trail.length - 1; i > 0; i--) {
        const p = trail[i] as TrailPt;
        const q = trail[i - 1] as TrailPt;
        len += Math.hypot(p.x - q.x, p.y - q.y);
        if (len > TRAIL_MAX_PX) {
          trail.splice(0, i);
          break;
        }
        const age = now - q.t;
        const decay = Math.exp(-age / TRAIL_TAU_MS);
        const alpha = Math.min(0.85, 0.85 * decay * (1 + 0.4 * q.flare));
        if (alpha < 0.01) {
          trail.splice(0, i);
          break;
        }
        ctx.strokeStyle = rgba('--c-accent-hi', alpha);
        ctx.lineWidth = (2.6 + 1.6 * q.flare) * (0.35 + 0.65 * decay);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawNode(
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      pulse: Pulse | undefined,
      scale: number,
      alphaMul: number,
      tone: string,
      dt: number,
      reduced: boolean,
    ): void {
      let r = NODE_R * scale;
      let k = 0; // glow strength
      if (pulse) {
        pulse.age += dt;
        if (pulse.kind === 'fire') {
          const ms = reduced ? 150 : BLOOM_MS;
          const u = Math.min(1, pulse.age / ms);
          // 6 → 22 → 6: a fast --ease-enter attack, a soft release
          const env = u < 0.3 ? easeEnter(u / 0.3) : 1 - easeLoop((u - 0.3) / 0.7);
          r = (NODE_R + 16 * env) * scale;
          k = env;
        } else {
          const u = Math.min(1, pulse.age / PLACE_MS);
          r = NODE_R * scale * (reduced ? 1 : easeEnter(u) * (1 + 0.25 * Math.sin(Math.PI * u)));
          k = 0.6 * (1 - u);
        }
      }
      const hover = Math.max(0, (scale - 1) / (SWELL_SCALE - 1));
      glow(ctx, x, y, r, Math.max(k, 0.55 * hover) * alphaMul, tone, '--c-accent-2');
      disc(ctx, x, y, r, rgba(tone, Math.min(1, (NODE_ALPHA + 0.2 * Math.max(k, hover)) * alphaMul)));
      if (k > 0) disc(ctx, x, y, Math.max(1, r * 0.45), rgba('--c-accent-hi', 0.9 * k * alphaMul));
    }

    function stepSwell(sw: Swell, target: number, dt: number): void {
      // an underdamped spring, the canvas stand-in for --spring-magnetic
      const kSpring = 220;
      const damp = 2 * Math.sqrt(kSpring) * 0.6;
      const h = Math.min(dt, 34) / 1000;
      const acc = -kSpring * (sw.s - target) - damp * sw.v;
      sw.v += acc * h;
      sw.s += sw.v * h;
      if (Math.abs(sw.s - target) < 0.002 && Math.abs(sw.v) < 0.02) {
        sw.s = target;
        sw.v = 0;
      }
    }

    function drawRing(f: ClockFrame, reduced: boolean): void {
      const ctx = ringCtx;
      if (!ctx) return;
      const g = geometry;
      const dt = f.dt;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (dissolves.length > 0) {
        // a flicked node dissolves wherever it was released: clear everything
        ctx.clearRect(0, 0, ringCanvas!.width, ringCanvas!.height);
      } else {
        // everything else the ring layer paints sits within 0.6 R + 80 px of the
        // ring (nodes to 1.294 R, glow to +72 px); clearing only that box is the
        // cheapest thing a frame can do on a tall phone
        const m = g.R * 1.6 + 80;
        const k = g.dpr;
        const x0 = Math.max(0, Math.floor((g.cx - m) * k));
        const y0 = Math.max(0, Math.floor((g.cy - m) * k));
        const x1 = Math.min(ringCanvas!.width, Math.ceil((g.cx + m) * k));
        const y1 = Math.min(ringCanvas!.height, Math.ceil((g.cy + m) * k));
        ctx.clearRect(x0, y0, x1 - x0, y1 - y0);
      }
      ctx.restore();

      const headPhase = reduced ? f.phase : mod1(f.phase + offset);
      const head = pointAt(headPhase, SEED_R, g);

      // --- comet trail (polyline, exp(−age/τ)), then the crisp ring over it
      if (!reduced) {
        // one point per ~6 px of travel keeps the tail at ~16–24 strokes a frame
        const last = trail[trail.length - 1];
        const fl = flare > 0 ? flare / FLARE_MS : 0;
        if (!last || Math.hypot(last.x - head.x, last.y - head.y) >= 6) {
          trail.push({ x: head.x, y: head.y, t: f.t, flare: fl });
        } else if (trail.length >= 2) {
          // slide the newest point along with the head so the tail stays attached
          last.x = head.x;
          last.y = head.y;
          last.t = f.t;
          last.flare = Math.max(last.flare, fl);
        }
        drawTrail(ctx, f.t);
      } else if (trail.length) {
        trail.length = 0;
      }

      ringStroke(ctx, dt);

      // --- placement ripples: 0 → 64 px over --dur-6, alpha .22 → 0, width 2 → .5
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i] as Ripple;
        rp.age += dt;
        const ms = reduced ? 150 : RIPPLE_MS;
        const u = Math.min(1, rp.age / ms);
        if (u >= 1) {
          ripples.splice(i, 1);
          continue;
        }
        if (reduced) {
          ctx.lineWidth = 1;
          ctx.strokeStyle = rgba('--c-accent', 0.16 * (1 - u));
          ctx.beginPath();
          ctx.arc(rp.x, rp.y, 32, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.lineWidth = 2 - 1.5 * u;
          ctx.strokeStyle = rgba('--c-accent', 0.22 * (1 - u));
          ctx.beginPath();
          ctx.arc(rp.x, rp.y, 64 * easeExit(u), 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // --- removals dissolve over 240 ms, never a flash
      for (let i = dissolves.length - 1; i >= 0; i--) {
        const dv = dissolves[i] as Dissolve;
        dv.age += dt;
        const u = Math.min(1, dv.age / (reduced ? 150 : DISSOLVE_MS));
        if (u >= 1) {
          dissolves.splice(i, 1);
          continue;
        }
        disc(ctx, dv.x, dv.y, NODE_R * (1 - 0.6 * u), rgba('--c-accent', NODE_ALPHA * (1 - u)));
      }

      // --- the seed node: the site's, until it is touched
      const seedNow = st.seedPresent ? getSeed() : null;
      if (seedNow) {
        const p = pointAt(seedNow.a, seedNow.r, g);
        const near = pointer.active && !reduced ? Math.hypot(pointer.x - p.x, pointer.y - p.y) : Infinity;
        stepSwell(seedSwell, near <= SWELL_PX ? SWELL_SCALE : 1, dt);
        const pulse: Pulse | undefined = seedPulse < BLOOM_MS ? { age: seedPulse, kind: 'fire' } : undefined;
        drawNode(ctx, p.x, p.y, pulse, seedSwell.s, SEED_ALPHA, '--c-accent', dt, reduced);
        seedPulse += dt;
      }

      // --- the visitor's nodes
      for (const n of nodes) {
        const dragging = n.id === dragId;
        const p = dragging ? pointAt(dragA, dragLevel, g) : pointAt(n.a, n.r, g);
        let sw = swells.get(n.id);
        if (!sw) {
          sw = { s: 1, v: 0 };
          swells.set(n.id, sw);
        }
        const near = pointer.active && !reduced ? Math.hypot(pointer.x - p.x, pointer.y - p.y) : Infinity;
        const target = dragging || near <= SWELL_PX ? SWELL_SCALE : 1;
        stepSwell(sw, reduced ? 1 : target, dt);
        const pulse = pulses.get(n.id);
        drawNode(ctx, p.x, p.y, pulse, sw.s, 1, '--c-accent', dt, reduced);
        if (pulse && pulse.age >= (pulse.kind === 'fire' ? (reduced ? 150 : BLOOM_MS) : PLACE_MS)) {
          pulses.delete(n.id);
        }
      }
      if (swells.size > nodes.length + 8) {
        const ids = new Set(nodes.map((n) => n.id));
        for (const id of swells.keys()) if (!ids.has(id)) swells.delete(id);
      }

      // --- the ghost-node self-demo (§B): Ember, 45%, fades in 400 ms, out 800 ms
      if (ghost && !ghost.gone) {
        let alpha = GHOST_ALPHA * Math.min(1, ghost.age / GHOST_FADE_IN);
        let pulse: Pulse | undefined;
        if (ghost.fired) {
          alpha = GHOST_ALPHA * Math.max(0, 1 - ghost.fireAge / GHOST_FADE_OUT);
          if (ghost.fireAge < BLOOM_MS) pulse = { age: ghost.fireAge, kind: 'fire' };
        }
        if (ghost.cancelled) alpha = Math.min(alpha, GHOST_ALPHA * Math.max(0, 1 - ghost.fireAge / DISSOLVE_MS));
        const p = pointAt(ghost.a, SEED_R, g);
        drawNode(ctx, p.x, p.y, pulse, 1, alpha / NODE_ALPHA, '--c-accent-3', 0, reduced);
      }

      // --- the sweep head: 3 px, --c-accent-hi, glowing; flare for 240 ms after a fire
      const fk = flare > 0 ? flare / FLARE_MS : 0;
      glow(ctx, head.x, head.y, 3, reduced ? 0.5 : 0.7 + 0.3 * fk, '--c-accent-hi', '--c-accent-2');
      disc(ctx, head.x, head.y, 3 + 1.5 * fk, rgba('--c-accent-hi', 1));
    }

    /* ---------------------------------------------------------- the frame driver */

    const unsubFrame = subscribeFrame((f) => {
      if (!st.bootAdopted) adoptBootstrap();
      const reduced = loopRef.current.reducedMotion;
      const dt = f.dt;
      const p0 = prevPhase;

      // 1. fires (the store's nodes), the seed's pulse, the ghost's fire
      computeFires(p0, f.phase, f.dir, fired, f.periodMs);
      if (st.seedPresent && crossed(p0, f.phase, f.dir, SEED_A)) seedPulse = 0;
      prevPhase = f.phase;

      runtime.frame = f;
      runtime.fired = fired;
      runtime.nodes = nodes;
      runtime.geometry = geometry;

      for (const ev of fired) {
        pulses.set(ev.node.id, { age: 0, kind: 'fire' });
        flare = FLARE_MS;
        if (boot) boot.lastFire = { id: ev.node.id, t: f.t, lateness: ev.lateness };
      }
      if (seedPulse === 0) flare = FLARE_MS;

      // 2. the ghost demo schedule: 6 s, 14 s, never a third, never after input
      if (!st.interacted) {
        if (st.ghostsDone === 0 && f.t >= GHOST_FIRST_MS) {
          ghost = { a: mod1(f.phase + 0.25), age: 0, fired: false, fireAge: 0, gone: false, cancelled: false };
          st.firstGhostA = ghost.a;
          st.ghostsDone = 1;
          stage!.dataset.ghost = 'shown';
        } else if (st.ghostsDone === 1 && (!ghost || ghost.gone) && f.t >= GHOST_SECOND_MS) {
          ghost = { a: mod1(st.firstGhostA + 1 / 3), age: 0, fired: false, fireAge: 0, gone: false, cancelled: false };
          st.ghostsDone = 2;
          stage!.dataset.ghost = 'shown';
        }
      }
      if (ghost && !ghost.gone) {
        ghost.age += dt;
        if (ghost.cancelled) {
          ghost.fireAge += dt;
          if (ghost.fireAge >= DISSOLVE_MS) ghost.gone = true;
        } else if (!ghost.fired) {
          if (crossed(p0, f.phase, f.dir, ghost.a)) {
            ghost.fired = true;
            flare = FLARE_MS;
            st.ghostFires += 1;
            stage!.dataset.ghostFires = String(st.ghostFires);
          }
        } else {
          ghost.fireAge += dt;
          if (ghost.fireAge >= GHOST_FADE_OUT) {
            ghost.gone = true;
            stage!.dataset.ghost = st.ghostsDone >= 2 ? 'done' : 'idle';
          }
        }
      }

      // 3. the rendered lead/lag offset (§C.2): pointer-proximity slowing, then re-convergence
      if (!reduced) {
        const headNow = pointAt(mod1(f.phase + offset), SEED_R, geometry);
        const nearHead = pointer.active && Math.hypot(pointer.x - headNow.x, pointer.y - headNow.y) <= SLOW_PX;
        if (nearHead && slowMs < SLOW_MAX_MS) {
          slowing = true;
          converge = null;
          slowMs += dt;
          offset -= (f.dir * (1 - SLOW_RATE) * dt) / f.periodMs;
          offset = Math.max(-SLOW_MAX_OFFSET, Math.min(SLOW_MAX_OFFSET, offset));
        } else {
          if (!nearHead) slowMs = 0;
          if (slowing) {
            slowing = false;
            if (offset !== 0) converge = { from: offset, t: 0, dur: RECONVERGE_MS };
          }
        }
        if (converge) {
          converge.t += dt;
          const k = easeLoop(converge.t / converge.dur);
          offset = converge.from * (1 - k);
          if (converge.t >= converge.dur) {
            offset = 0;
            converge = null;
          }
        }
      } else {
        offset = 0;
        converge = null;
      }

      if (flare > 0) flare = Math.max(0, flare - dt);

      // 4. draw
      drawRing(f, reduced);

      // 5. the handover from the CSS ring: measure where its hand is, ease onto the clock
      if (!st.live) {
        st.live = true;
        if (!reduced) {
          let cssPhase: number | null = null;
          try {
            const arm = stage!.querySelector<HTMLElement>('.rf-arm');
            const anim = arm?.getAnimations?.()[0];
            const progress = anim?.effect?.getComputedTiming().progress;
            if (typeof progress === 'number' && Number.isFinite(progress)) {
              cssPhase = mod1(progress);
            } else {
              if (boot?.t0 !== undefined) cssPhase = mod1(0.33 + (performance.now() - boot.t0) / SWEEP_MS);
            }
          } catch {
            cssPhase = null;
          }
          if (cssPhase !== null) {
            const delta = turnDelta(f.phase, cssPhase);
            if (Math.abs(delta) > 0.002) {
              offset = delta;
              converge = { from: delta, t: 0, dur: Math.max(RECONVERGE_MS, (Math.abs(delta) / HANDOVER_MAX_RATE) * 1000) };
              trail.length = 0;
            }
          }
        }
        html.setAttribute('data-ring-live', '');
      }
    }, -1000);

    /* ---------------------------------------------------------- input */

    function localPoint(e: PointerEvent): { x: number; y: number } {
      const rect = stage!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function nearestNode(x: number, y: number): RingNode | null {
      let best: RingNode | null = null;
      let bestD = GRAB_PX;
      for (const n of nodes) {
        const p = pointAt(n.a, n.r, geometry);
        const d = Math.hypot(p.x - x, p.y - y);
        if (d <= bestD) {
          bestD = d;
          best = n;
        }
      }
      return best;
    }

    function beginDrag(id: string, e: PointerEvent, x: number, y: number): void {
      dragId = id;
      dragPointer = e.pointerId;
      const n = nodes.find((m) => m.id === id);
      dragA = n ? n.a : angleAt(x, y, geometry);
      dragLevel = n ? n.r : levelAt(x, y, geometry);
      samples.length = 0;
      samples.push({ x, y, t: performance.now() });
      try {
        stage!.setPointerCapture(e.pointerId);
      } catch {
        /* capture unsupported */
      }
    }

    function onPointerDown(e: PointerEvent): void {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      markInteracted();
      const { x, y } = localPoint(e);
      if (e.pointerType !== 'touch') {
        pointer.x = x;
        pointer.y = y;
        pointer.active = true;
      }

      // grab an existing node within 22 px before placing a new one (§C.3)
      const grab = nearestNode(x, y);
      if (grab) {
        beginDrag(grab.id, e, x, y);
        return;
      }
      // grab the seed: it becomes the visitor's the moment they touch it
      const seedNow = st.seedPresent ? getSeed() : null;
      if (seedNow) {
        const sp = pointAt(seedNow.a, seedNow.r, geometry);
        if (Math.hypot(sp.x - x, sp.y - y) <= GRAB_PX) {
          const promoted = addNode(seedNow.a, seedNow.r);
          st.seedPresent = false;
          setSeed(null);
          if (promoted) {
            swells.set(promoted.id, { s: seedSwell.s, v: seedSwell.v });
            beginDrag(promoted.id, e, x, y);
            loopRef.current.onExplore({ name: 'section_interacted', section: loopRef.current.section as never });
          }
          return;
        }
      }

      if (!isOnBand(x, y, geometry)) return; // the centre is reserved for SLOW (§C.13)

      const node = addNode(angleAt(x, y, geometry), levelAt(x, y, geometry));
      if (!node) {
        rimFlash = RIM_FLASH_MS; // 25th tap: one Ember rim flash, no copy
        st.refused += 1;
        stage!.dataset.refused = String(st.refused);
        return;
      }
      st.lastLevel = node.r;
      pulses.set(node.id, { age: 0, kind: 'place' });
      ripples.push({ x, y, age: 0 });
      try {
        navigator.vibrate?.(8);
      } catch {
        /* no haptics */
      }
      loopRef.current.onExplore({ name: 'section_interacted', section: loopRef.current.section as never });
    }

    function onPointerMove(e: PointerEvent): void {
      const { x, y } = localPoint(e);
      if (e.pointerType !== 'touch') {
        pointer.x = x;
        pointer.y = y;
        pointer.active = true;
      }
      if (dragId === null || e.pointerId !== dragPointer) return;
      const now = performance.now();
      samples.push({ x, y, t: now });
      while (samples.length > 6) samples.shift();
      dragA = angleAt(x, y, geometry);
      const dist = Math.hypot(x - geometry.cx, y - geometry.cy);
      dragLevel = Math.max(0, Math.min(15, (dist / geometry.R - 1) / LEVEL_STEP + SEED_R));
      // the store follows (quantized) so rooms hear the retiming live; release commits
      moveNode(dragId, dragA, dragLevel);
    }

    function endDrag(e: PointerEvent, cancelled: boolean): void {
      if (dragId === null || e.pointerId !== dragPointer) return;
      const id = dragId;
      dragId = null;
      dragPointer = -1;
      const { x, y } = localPoint(e);
      try {
        stage!.releasePointerCapture(e.pointerId);
      } catch {
        /* capture unsupported */
      }
      if (cancelled) return;

      // release velocity: the last ~120 ms of movement, or the last segment if
      // the pointer reported more sparsely than that (a loaded main thread)
      const now = performance.now();
      const last = samples[samples.length - 1] ?? { x, y, t: now };
      let from: Sample | null = null;
      for (const s of samples) {
        if (now - s.t <= 120 && s !== last) {
          from = s;
          break;
        }
      }
      if (!from && samples.length >= 2) from = samples[samples.length - 2] ?? null;
      const dtMs = from ? Math.max(1, last.t - from.t) : 1;
      const speed = from ? Math.hypot(last.x - from.x, last.y - from.y) / dtMs : 0;
      const dist = Math.hypot(x - geometry.cx, y - geometry.cy);
      // a drag that crossed the flick radius in under half a second is a flick even
      // when a starved main thread delivered too few samples to measure its speed
      const wholeMs = samples.length >= 2 ? last.t - samples[0]!.t : Infinity;

      if (dist > FLICK_RADIUS * geometry.R && (speed > FLICK_SPEED || wholeMs < 500)) {
        removeNode(id);
        dissolves.push({ x, y, age: 0 });
        swells.delete(id);
        return;
      }
      moveNode(id, angleAt(x, y, geometry), levelAt(x, y, geometry));
      const n = nodes.find((m) => m.id === id);
      if (n) st.lastLevel = n.r;
    }

    function onPointerUp(e: PointerEvent): void {
      if (dragId !== null && e.pointerId === dragPointer) {
        // a drag is a ring gesture, not a corridor swipe
        e.stopImmediatePropagation();
      }
      endDrag(e, false);
    }
    function onPointerCancel(e: PointerEvent): void {
      endDrag(e, true);
    }
    function onPointerLeave(): void {
      pointer.active = false;
    }

    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointercancel', onPointerCancel);
    stage.addEventListener('pointerleave', onPointerLeave);

    /* --- the keyboard equivalents that belong to the ring (§C.12). Corridor
           keys (arrows left/right, digits, S, K, Esc) are handled by AppShell. */
    function onKeyDown(e: KeyboardEvent): void {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!/^(Tab|Shift|Control|Alt|Meta|CapsLock)$/.test(e.key)) markInteracted();
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        // quantized to 1/256 on commit; nudged half a step back so rounding can
        // never land the node a few ms AHEAD of the head (an instant fire)
        const node = addNode(getFrame().phase - 0.5 / 256, st.lastLevel);
        if (!node) {
          rimFlash = RIM_FLASH_MS;
          st.refused += 1;
          stage!.dataset.refused = String(st.refused);
          return;
        }
        pulses.set(node.id, { age: 0, kind: 'place' });
        const p = pointAt(node.a, node.r, geometry);
        ripples.push({ x: p.x, y: p.y, age: 0 });
        loopRef.current.onExplore({ name: 'section_interacted', section: loopRef.current.section as never });
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const last = nodes[nodes.length - 1];
        if (!last) return;
        e.preventDefault();
        st.lastLevel = Math.max(0, Math.min(15, last.r + (e.key === 'ArrowUp' ? 1 : -1)));
        moveNode(last.id, last.a, st.lastLevel);
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = dragId ? nodes.find((n) => n.id === dragId) : nodes[nodes.length - 1];
        if (!target) return;
        e.preventDefault();
        const p = pointAt(target.a, target.r, geometry);
        dissolves.push({ x: p.x, y: p.y, age: 0 });
        swells.delete(target.id);
        if (dragId === target.id) dragId = null;
        removeNode(target.id);
      }
    }
    stage.addEventListener('keydown', onKeyDown);

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      ro.disconnect();
      unsubFrame();
      unsubNodes();
      stage.removeEventListener('pointerdown', onPointerDown);
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerup', onPointerUp);
      stage.removeEventListener('pointercancel', onPointerCancel);
      stage.removeEventListener('pointerleave', onPointerLeave);
      stage.removeEventListener('keydown', onKeyDown);
    };
  }, [heavy]);

  const room = bySlug(loop.section);
  const label = `${room?.title ?? loop.section}${room?.hook ? ` — ${room.hook},` : ' —'} drawn from your ${loop.nodeCount} nodes`;

  return (
    <div
      id="stage"
      ref={stageRef}
      role="application"
      tabIndex={0}
      aria-label="the ring — place nodes on a four second loop"
      data-max-nodes={MAX_NODES}
      data-node-count={loop.nodeCount}
      data-sweep-ms={SWEEP_MS}
    >
      <canvas id="loop-bg" ref={bgRef} aria-hidden="true" />
      <canvas id="loop-room" ref={roomRef} role="img" aria-label={label} />
      <canvas id="loop-ring" ref={ringRef} aria-hidden="true" />
      {/* The ring before React: painted by CSS from the bootstrap's geometry
          mirrors, already turning at phase 0.33, seed node pulsing at 0.62.
          Hidden by html[data-ring-live] the instant the canvas draws. */}
      <div className="rf" aria-hidden="true">
        <div className="rf-track" />
        <div className="rf-seed" />
        <div className="rf-arm">
          <div className="rf-tail" />
          <i className="rf-head" />
        </div>
      </div>
      <i className="rf-tap" aria-hidden="true" />
      <div className="rf-cursors" aria-hidden="true">
        <i className="rf-cursor" />
        <i className="rf-cursor" />
        <i className="rf-cursor" />
      </div>
    </div>
  );
}
