'use client';

/**
 * src/components/ring/RingStage.tsx — the persistent ring.
 *
 * Spec: design/05-build-spec.md §C.1–C.3, §F.6.
 *
 * **OWNED BY WP1 from here on.** WP0 ships the working minimum the QA gate and
 * every other work package depend on: three stacked canvases, geometry, the
 * sweep with its comet trail, node placement / move / removal, firing, the
 * 24-node rim flash and the ghost-node self-demo.
 *
 * RingStage mounts ONCE, outside the room switch. It is never unmounted, keyed
 * or remounted by navigation: the phase and the node set survive every
 * transition. Rooms draw on the background and room layers only — the ring
 * layer belongs here.
 *
 * Note on the trail: §C.2 says "do not clear the ring layer, paint
 * rgba(canvas, 1 - exp(-dt/380)) over it each frame". Taken literally that
 * would also smear the ring stroke and the nodes, so the decay runs on a
 * dedicated offscreen trail layer which is then composited under the crisp
 * ring. The recipe, the tau and the 'lighter' head are exactly as specified.
 */

import { useEffect, useRef } from 'react';
import { getFrame, subscribeFrame, SWEEP_MS } from '@/lib/clock';
import {
  addNode,
  computeFires,
  getNodes,
  MAX_NODES,
  moveNode,
  removeNode,
  subscribeNodes,
} from '@/lib/ring-store';
import {
  angleAt,
  computeGeometry,
  isOnBand,
  levelAt,
  pointAt,
} from '@/lib/ring-geometry';
import { dprFor, sizeCanvas } from '@/lib/use-canvas';
import { rgba } from '@/lib/tokens';
import type { FireEvent, RingGeometry, RingNode } from '@/lib/types';
import { useLoop } from '../shell/LoopContext';

const TRAIL_TAU_MS = 380;
const GRAB_PX = 22;
const RIPPLE_MS = 520;
const BLOOM_MS = 240;
const GHOST_FIRST_MS = 6000;
const GHOST_SECOND_MS = 14000;
const GHOST_FADE_IN = 400;
const GHOST_FADE_OUT = 800;

interface Ripple {
  x: number;
  y: number;
  age: number;
}

interface Bloom {
  id: string;
  age: number;
}

interface Ghost {
  a: number;
  bornT: number;
  fired: boolean;
  fireAge: number;
  gone: boolean;
}

export function RingStage({
  heavy = false,
  onGeometry,
}: {
  heavy?: boolean;
  onGeometry?: () => void;
}) {
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

  useEffect(() => {
    const stage = stageRef.current;
    const bgCanvas = bgRef.current;
    const roomCanvas = roomRef.current;
    const ringCanvas = ringRef.current;
    if (!stage || !bgCanvas || !roomCanvas || !ringCanvas) return;

    const runtime = loopRef.current.runtime;
    const trail = document.createElement('canvas');

    let ringCtx: CanvasRenderingContext2D | null = null;
    let trailCtx: CanvasRenderingContext2D | null = null;
    let geometry: RingGeometry = computeGeometry(0, 0, false);
    let nodes: readonly RingNode[] = getNodes();

    const ripples: Ripple[] = [];
    const blooms = new Map<string, Bloom>();
    const fired: FireEvent[] = [];
    let rimFlash = 0;
    let prevPhase = getFrame().phase;
    let interacted = false;
    let ghost: Ghost | null = null;
    let ghostsDone = 0;
    let lastLevel = 8;

    /* ---------------------------------------------------------- sizing */

    function resize(): void {
      const w = stage!.clientWidth || window.innerWidth;
      const h = stage!.clientHeight || window.innerHeight;
      const coarse =
        typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: coarse)').matches : false;
      const ringDpr = dprFor(w, h, false);
      const roomDpr = dprFor(w, h, heavy);

      ringCtx = sizeCanvas(ringCanvas!, w, h, ringDpr);
      trail.width = Math.max(1, Math.round(w * ringDpr));
      trail.height = Math.max(1, Math.round(h * ringDpr));
      trailCtx = trail.getContext('2d');
      trailCtx?.setTransform(ringDpr, 0, 0, ringDpr, 0, 0);

      runtime.bg = sizeCanvas(bgCanvas!, w, h, roomDpr);
      runtime.ctx = sizeCanvas(roomCanvas!, w, h, roomDpr);

      geometry = computeGeometry(w, h, coarse);
      geometry.dpr = ringDpr;
      runtime.geometry = geometry;

      // CSS mirrors, so the caption sits under the ring without a layout read.
      const s = document.documentElement.style;
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

    /* ---------------------------------------------------------- drawing */

    function drawRing(dt: number, phase: number, reduced: boolean): void {
      const ctx = ringCtx;
      if (!ctx) return;
      const g = geometry;
      const { cx, cy, R } = g;

      // --- comet trail on its own layer, exponential decay, frame-rate independent
      if (trailCtx) {
        if (reduced) {
          trailCtx.save();
          trailCtx.setTransform(1, 0, 0, 1, 0, 0);
          trailCtx.clearRect(0, 0, trail.width, trail.height);
          trailCtx.restore();
        } else {
          trailCtx.save();
          trailCtx.setTransform(1, 0, 0, 1, 0, 0);
          trailCtx.globalCompositeOperation = 'destination-out';
          trailCtx.fillStyle = `rgba(0,0,0,${1 - Math.exp(-dt / TRAIL_TAU_MS)})`;
          trailCtx.fillRect(0, 0, trail.width, trail.height);
          trailCtx.restore();

          const head = pointAt(phase, 8, g);
          trailCtx.globalCompositeOperation = 'lighter';
          trailCtx.globalAlpha = 0.85;
          trailCtx.fillStyle = rgba('--c-accent', 0.9);
          trailCtx.beginPath();
          trailCtx.arc(head.x, head.y, 2.4, 0, Math.PI * 2);
          trailCtx.fill();
          trailCtx.globalAlpha = 1;
          trailCtx.globalCompositeOperation = 'source-over';
        }
      }

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, ringCanvas!.width, ringCanvas!.height);
      ctx.restore();

      if (trailCtx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(trail, 0, 0);
        ctx.restore();
      }

      // --- the ring itself: one hairline, plus an inner accent track at 12%
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = rimFlash > 0 ? rgba('--c-accent-3', 0.9) : rgba('--c-border-strong', 1);
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba('--c-accent', 0.12);
      ctx.beginPath();
      ctx.arc(cx, cy, R - 4, 0, Math.PI * 2);
      ctx.stroke();

      // --- ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i] as Ripple;
        rp.age += dt;
        const k = Math.min(1, rp.age / RIPPLE_MS);
        if (k >= 1) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.lineWidth = 2 - 1.5 * k;
        ctx.strokeStyle = rgba('--c-accent', 0.22 * (1 - k));
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, (reduced ? 32 : 64) * (reduced ? 1 : k), 0, Math.PI * 2);
        ctx.stroke();
      }

      // --- nodes
      for (const n of nodes) {
        const p = pointAt(n.a, n.r, g);
        const bloom = blooms.get(n.id);
        let radius = 6;
        if (bloom) {
          bloom.age += dt;
          const k = Math.min(1, bloom.age / BLOOM_MS);
          radius = 6 + 16 * Math.sin(Math.PI * k);
          if (k >= 1) blooms.delete(n.id);
        }
        ctx.fillStyle = rgba('--c-accent', bloom ? 1 : 0.8);
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- the ghost-node self-demo (§B, 6 s and 14 s, never after real input)
      if (ghost && !ghost.gone) {
        const t = getFrame().t;
        const age = t - ghost.bornT;
        let alpha = 0.45 * Math.min(1, age / GHOST_FADE_IN);
        if (ghost.fired) {
          ghost.fireAge += dt;
          alpha = 0.45 * Math.max(0, 1 - ghost.fireAge / GHOST_FADE_OUT);
          if (ghost.fireAge > GHOST_FADE_OUT) ghost.gone = true;
        }
        const gp = pointAt(ghost.a, 8, g);
        ctx.fillStyle = rgba('--c-accent-3', alpha);
        ctx.beginPath();
        ctx.arc(gp.x, gp.y, ghost.fired ? 14 : 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- the sweep head
      const head = pointAt(phase, 8, g);
      ctx.fillStyle = rgba('--c-accent-hi', 1);
      ctx.beginPath();
      ctx.arc(head.x, head.y, 3, 0, Math.PI * 2);
      ctx.fill();

      if (rimFlash > 0) rimFlash = Math.max(0, rimFlash - dt);
    }

    /* ---------------------------------------------------------- the frame driver */

    const unsubFrame = subscribeFrame((f) => {
      const reduced = loopRef.current.reducedMotion;

      computeFires(prevPhase, f.phase, f.dir, fired, f.periodMs);
      prevPhase = f.phase;

      runtime.frame = f;
      runtime.fired = fired;
      runtime.nodes = nodes;
      runtime.geometry = geometry;

      for (const ev of fired) {
        blooms.set(ev.node.id, { id: ev.node.id, age: 0 });
        const p = pointAt(ev.node.a, ev.node.r, geometry);
        ripples.push({ x: p.x, y: p.y, age: 0 });
      }

      // ghost demo schedule
      if (!interacted) {
        if (ghostsDone === 0 && f.t >= GHOST_FIRST_MS) {
          ghost = { a: (f.phase + 0.25) % 1, bornT: f.t, fired: false, fireAge: 0, gone: false };
          ghostsDone = 1;
        } else if (ghostsDone === 1 && ghost?.gone && f.t >= GHOST_SECOND_MS) {
          ghost = {
            a: (f.phase + 0.25 + 1 / 3) % 1,
            bornT: f.t,
            fired: false,
            fireAge: 0,
            gone: false,
          };
          ghostsDone = 2;
        }
        if (ghost && !ghost.fired && !ghost.gone) {
          const behind = f.dir > 0 ? (f.phase - ghost.a + 1) % 1 : (ghost.a - f.phase + 1) % 1;
          const travelled = Math.abs(f.dt / f.periodMs);
          if (f.t - ghost.bornT > GHOST_FADE_IN && behind < travelled) ghost.fired = true;
        }
      }

      drawRing(f.dt, f.phase, reduced);
    }, -1000);

    /* ---------------------------------------------------------- input */

    let dragId: string | null = null;
    let dragPointer = -1;
    let downX = 0;
    let downY = 0;
    let downT = 0;

    function markInteracted(): void {
      if (interacted) return;
      interacted = true;
      ghost = null; // any real input cancels the schedule permanently
      document.documentElement.dataset.stageState = 'engaged';
    }

    function localPoint(e: PointerEvent): { x: number; y: number } {
      const rect = stage!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function onPointerDown(e: PointerEvent): void {
      markInteracted();
      const { x, y } = localPoint(e);

      // grab an existing node within 22 px before placing a new one
      for (const n of nodes) {
        const p = pointAt(n.a, n.r, geometry);
        if (Math.hypot(p.x - x, p.y - y) <= GRAB_PX) {
          dragId = n.id;
          dragPointer = e.pointerId;
          downX = x;
          downY = y;
          downT = performance.now();
          try {
            stage!.setPointerCapture(e.pointerId);
          } catch {
            /* capture unsupported */
          }
          return;
        }
      }

      if (!isOnBand(x, y, geometry)) return; // the centre is reserved for SLOW

      const node = addNode(angleAt(x, y, geometry), levelAt(x, y, geometry));
      if (!node) {
        rimFlash = 240; // 25th tap: one Ember rim flash, no copy
        return;
      }
      lastLevel = node.r;
      try {
        navigator.vibrate?.(8);
      } catch {
        /* no haptics */
      }
      loopRef.current.onExplore({
        name: 'section_interacted',
        section: loopRef.current.section as never,
      });
    }

    function onPointerMove(e: PointerEvent): void {
      if (dragId === null || e.pointerId !== dragPointer) return;
      const { x, y } = localPoint(e);
      moveNode(dragId, angleAt(x, y, geometry), levelAt(x, y, geometry));
    }

    function onPointerUp(e: PointerEvent): void {
      if (dragId === null || e.pointerId !== dragPointer) return;
      const { x, y } = localPoint(e);
      const dist = Math.hypot(x - geometry.cx, y - geometry.cy);
      const dt = Math.max(1, performance.now() - downT);
      const speed = Math.hypot(x - downX, y - downY) / dt;
      if (dist > 1.45 * geometry.R && speed > 0.6) removeNode(dragId);
      dragId = null;
      dragPointer = -1;
      try {
        stage!.releasePointerCapture(e.pointerId);
      } catch {
        /* capture unsupported */
      }
    }

    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointercancel', onPointerUp);

    /* --- the keyboard equivalents that belong to the ring (§C.12). Corridor
           keys (arrows, digits) are handled by AppShell. */
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        markInteracted();
        const node = addNode(getFrame().phase, lastLevel);
        if (!node) rimFlash = 240;
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const last = nodes[nodes.length - 1];
        if (!last) return;
        e.preventDefault();
        markInteracted();
        lastLevel = Math.max(0, Math.min(15, last.r + (e.key === 'ArrowUp' ? 1 : -1)));
        moveNode(last.id, last.a, lastLevel);
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const last = nodes[nodes.length - 1];
        if (!last) return;
        e.preventDefault();
        markInteracted();
        removeNode(last.id);
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
      stage.removeEventListener('pointercancel', onPointerUp);
      stage.removeEventListener('keydown', onKeyDown);
    };
  }, [heavy]);

  const label = `${loop.section} — drawn from your ${loop.nodeCount} nodes`;

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
    </div>
  );
}
