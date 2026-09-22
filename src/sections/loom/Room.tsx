'use client';

/**
 * src/sections/loom/Room.tsx — LOOM, the client half (§D.9).
 *
 * The visitor's loop as an infinite textile. One tile of the weave is rendered
 * to an offscreen canvas only when something structural changes (the node set,
 * the geometry, the tier); every frame then blits that tile across the band at
 * an offset locked to the clock — exactly one tile per revolution — and paints
 * the 240 ms fire highlight over the fired node's column. The hot path
 * allocates nothing: the column owner table, the fire timers and the tile are
 * all created once in the effect.
 *
 * Follows src/sections/_example/Room.tsx rule for rule: one effect keyed on
 * [seed, reducedMotion], one draw callback on the shared clock, props read
 * through a ref, nothing drawn on the ring layer, the node set never mutated.
 */

import { useEffect, useRef } from 'react';
import { subscribeFrame } from '@/lib/clock';
import { isOnBand, pointAt } from '@/lib/ring-geometry';
import { duration, rgba } from '@/lib/tokens';
import type { RingNode, SectionProps } from '@/lib/types';
import {
  FIRE_MS,
  OVER_ALPHA,
  SPRING_MS,
  UNDER_ALPHA,
  WARP,
  WEFT,
  assignColumns,
  bandHeightFor,
  columnOf,
  depthFor,
  easeLoop,
  isGroundOver,
  isOver,
  tileOrigin,
  tilePeriod,
  warpFor,
} from './logic';
import styles from './room.module.css';

const HOOK = 'four thousand years';
const HOOK_MS = 3000;
/** §C.3: a pointerdown within 22 px of a node grabs it — the weave must not. */
const GRAB_PX = 22;
/** §C.3: never more than 24 nodes, so the fire timers are a fixed table. */
const MAX_NODES = 24;
/** A drag shorter than this is a tap, not a drag. */
const DRAG_MIN_PX = 4;

export default function Room(props: SectionProps) {
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  const rootRef = useRef<HTMLDivElement | null>(null);
  const depthRef = useRef(0);
  const viewedRef = useRef(false);
  const hookRef = useRef(false);
  const draggedRef = useRef(false);

  useEffect(() => {
    const first = propsRef.current;
    const reduced = first.reducedMotion;
    const stage = document.getElementById('stage');
    const root = rootRef.current;

    if (!viewedRef.current) {
      viewedRef.current = true;
      first.onExplore({ name: 'section_viewed', section: first.id });
    }

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
    }
    function dismissHook(): void {
      if (hookUntil > 0 && propsRef.current.clock.t < hookUntil) first.say('');
      hookUntil = 0;
    }

    // Release springs back over --dur-8 with --ease-loop; instant under reduced motion.
    const springMs = reduced ? 0 : duration('--dur-8') || SPRING_MS;

    /* ---------------------------------------------------------- the tile */

    const tile = document.createElement('canvas');
    let tileCtx: CanvasRenderingContext2D | null = null;
    const owner = new Int16Array(WARP);
    const fireAge = new Float32Array(MAX_NODES);
    let warp = 0;
    let tileW = 0;
    let tileH = 0;
    let pitchX = 0;
    let columnsSet = 0;
    let lastNodes: readonly RingNode[] | null = null;
    let lastR = -1;
    let lastW = -1;
    let lastH = -1;
    let lastDpr = -1;
    let bgGrad: CanvasGradient | null = null;

    function rebuild(nodes: readonly RingNode[], R: number, w: number, h: number, dpr: number, warpNow: number): void {
      warp = warpNow;
      tileW = tilePeriod(R);
      tileH = bandHeightFor(R, w);
      pitchX = tileW / warp;
      const pitchY = tileH / WEFT;
      tile.width = Math.max(1, Math.ceil(tileW * dpr));
      tile.height = Math.max(1, Math.ceil(tileH * dpr));
      tileCtx = tile.getContext('2d');
      const t = tileCtx;
      if (!t) return;
      t.setTransform(dpr, 0, 0, dpr, 0, 0);
      columnsSet = assignColumns(nodes, warp, owner);
      if (root) root.dataset.columns = String(columnsSet);

      const tw = Math.max(1, pitchX * 0.42); // warp thread width
      const th = Math.max(1, pitchY * 0.38); // weft thread height

      // ground cloth
      t.clearRect(0, 0, tileW, tileH);
      t.fillStyle = rgba('--c-surface', 1);
      t.fillRect(0, 0, tileW, tileH);

      // (a) every warp thread, continuous, as it looks UNDER the weft
      t.fillStyle = rgba('--c-border-strong', 0.32);
      t.beginPath();
      for (let c = 0; c < warp; c++) {
        if ((owner[c] ?? -1) >= 0) continue;
        t.rect(c * pitchX + (pitchX - tw) / 2, 0, tw, tileH);
      }
      t.fill();
      t.fillStyle = rgba('--c-accent', 0.26);
      t.beginPath();
      for (let c = 0; c < warp; c++) {
        if ((owner[c] ?? -1) < 0) continue;
        t.rect(c * pitchX + (pitchX - tw) / 2, 0, tw, tileH);
      }
      t.fill();

      // (b) the weft rows, continuous — the under-thread colour (§D.9)
      t.fillStyle = rgba('--c-accent-2', UNDER_ALPHA);
      t.beginPath();
      for (let y = 0; y < WEFT; y++) t.rect(0, y * pitchY + (pitchY - th) / 2, tileW, th);
      t.fill();

      // (c) the OVER segments: where the interlacement rule says the warp is
      //     over, the warp crosses on top of the weft for that row.
      t.fillStyle = rgba('--c-border-strong', 0.6);
      t.beginPath();
      for (let c = 0; c < warp; c++) {
        if ((owner[c] ?? -1) >= 0) continue;
        const x = c * pitchX + (pitchX - tw) / 2;
        for (let y = 0; y < WEFT; y++) {
          if (isGroundOver(y, c)) t.rect(x, y * pitchY, tw, pitchY);
        }
      }
      t.fill();
      t.fillStyle = rgba('--c-accent', OVER_ALPHA);
      t.beginPath();
      for (let c = 0; c < warp; c++) {
        const i = owner[c] ?? -1;
        if (i < 0) continue;
        const n = nodes[i];
        if (!n) continue;
        const x = c * pitchX + (pitchX - tw) / 2;
        for (let y = 0; y < WEFT; y++) {
          if (isOver(y, c, n.r, n.v)) t.rect(x, y * pitchY, tw, pitchY);
        }
      }
      t.fill();

      // selvedges
      t.fillStyle = rgba('--c-border-strong', 0.9);
      t.fillRect(0, 0, tileW, 1);
      t.fillRect(0, tileH - 1, tileW, 1);

      // background glow behind the band, cached with the geometry
      const p = propsRef.current.bg;
      if (p) {
        const top = h / 2 - tileH;
        bgGrad = p.createLinearGradient(0, top, 0, top + tileH * 2);
        bgGrad.addColorStop(0, rgba('--c-accent-2', 0));
        bgGrad.addColorStop(0.5, rgba('--c-accent-2', 0.07));
        bgGrad.addColorStop(1, rgba('--c-accent-2', 0));
      }
    }

    /* ---------------------------------------------------------- drag state */

    let dragging = false;
    let dragPointer = -1;
    let dragStartX = 0;
    let dragBase = 0;
    let drag = 0;
    let springFrom = 0;
    let springT = 0;
    let springing = false;

    function setWeaveState(s: 'locked' | 'drag' | 'spring'): void {
      if (root && root.dataset.weave !== s) root.dataset.weave = s;
    }
    setWeaveState('locked');

    function release(): void {
      springFrom = drag;
      springT = 0;
      springing = true;
      setWeaveState('spring');
    }

    /* ---------------------------------------------------------- draw */

    const unsubscribe = subscribeFrame(() => {
      const p = propsRef.current;
      if (!p.visible) return;
      const { ctx, bg, geometry: g, clock, nodes, fired, tier } = p;
      if (!ctx || !bg || g.R <= 0) return;
      const { w, h, cx, cy } = g;

      const warpNow = warpFor(w, tier);
      if (
        nodes !== lastNodes ||
        g.R !== lastR ||
        w !== lastW ||
        h !== lastH ||
        g.dpr !== lastDpr ||
        warpNow !== warp
      ) {
        rebuild(nodes, g.R, w, h, g.dpr, warpNow);
        lastNodes = nodes;
        lastR = g.R;
        lastW = w;
        lastH = h;
        lastDpr = g.dpr;
      }
      if (!tileCtx) return;

      // fires: brighten the node's own column for 240 ms
      for (let i = 0; i < fired.length; i++) {
        const ev = fired[i];
        if (!ev) continue;
        for (let j = 0; j < nodes.length && j < MAX_NODES; j++) {
          if (nodes[j] === ev.node) {
            fireAge[j] = FIRE_MS;
            break;
          }
        }
      }

      // spring back to clock-lock
      if (springing) {
        springT += clock.dt;
        const k = springMs > 0 ? easeLoop(Math.min(1, springT / springMs)) : 1;
        drag = springFrom * (1 - k);
        if (k >= 1) {
          springing = false;
          drag = 0;
          setWeaveState('locked');
        }
      }

      // ---- background
      clear(bg);
      if (bgGrad) {
        bg.fillStyle = bgGrad;
        bg.fillRect(0, 0, w, h);
      }

      // ---- room: the band, clipped so it is canvas-internal and never overflows
      clear(ctx);
      const W = tileW;
      const H = tileH;
      const top = cy - H / 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, top, w, H);
      ctx.clip();

      let x0: number;
      if (reduced) {
        // three tiles, still, centred — the band does not scroll (§D.9)
        x0 = cx - 1.5 * W;
        while (x0 > 0) x0 -= W;
      } else {
        x0 = tileOrigin(clock.phase, W, drag);
      }
      for (let x = x0; x < w; x += W) ctx.drawImage(tile, x, top, W, H);

      for (let j = 0; j < nodes.length && j < MAX_NODES; j++) {
        const age = fireAge[j] ?? 0;
        if (age <= 0) continue;
        fireAge[j] = age - clock.dt;
        const n = nodes[j];
        if (!n) continue;
        const c = columnOf(n.a, warp);
        ctx.fillStyle = rgba('--c-accent-hi', 0.5 * (age / FIRE_MS));
        for (let x = x0; x < w; x += W) ctx.fillRect(x + c * pitchX, top, pitchX, H);
      }
      ctx.restore();

      // ---- next affordance: one thread comes loose and trails toward the arc
      const sway = reduced ? 0 : 14 * Math.sin(clock.phase * Math.PI * 2);
      const xs = cx + pitchX * 1.5;
      ctx.strokeStyle = rgba('--c-accent-2', 0.45);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xs, top + H - H / WEFT);
      ctx.quadraticCurveTo(xs + sway * 3, top + H + (h - top - H) * 0.55, cx, h - 8);
      ctx.stroke();

      // ---- depth, monotonic, at most once per 0.25 step
      const depth = depthFor(columnsSet, draggedRef.current);
      if (depth > depthRef.current) {
        depthRef.current = depth;
        p.onExplore({ name: 'depth_reached', section: p.id, depth });
      }
    });

    /* ---------------------------------------------------------- input */

    function localPoint(e: PointerEvent): { x: number; y: number } {
      const rect = stage!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function onPointerDown(e: PointerEvent): void {
      dismissHook();
      if (!stage || tileH <= 0) return;
      const { x, y } = localPoint(e);
      const g = propsRef.current.geometry;
      if (Math.abs(y - g.cy) > tileH / 2) return; // not on the band
      if (isOnBand(x, y, g)) return; // the ring keeps its own gestures (§C.3)
      for (const n of propsRef.current.nodes) {
        const q = pointAt(n.a, n.r, g);
        if (Math.hypot(q.x - x, q.y - y) <= GRAB_PX) return;
      }
      dragging = true;
      dragPointer = e.pointerId;
      dragStartX = x;
      dragBase = drag;
      springing = false;
      setWeaveState('drag');
      try {
        stage.setPointerCapture(e.pointerId);
      } catch {
        /* capture unsupported */
      }
    }

    function onPointerMove(e: PointerEvent): void {
      if (!dragging || e.pointerId !== dragPointer) return;
      drag = dragBase + (localPoint(e).x - dragStartX);
    }

    function onPointerUp(e: PointerEvent): void {
      if (!dragging || e.pointerId !== dragPointer) return;
      dragging = false;
      dragPointer = -1;
      if (Math.abs(drag - dragBase) >= DRAG_MIN_PX) draggedRef.current = true;
      release();
      try {
        stage?.releasePointerCapture(e.pointerId);
      } catch {
        /* capture unsupported */
      }
    }

    /** Keyboard equivalent of the drag: `,` / `.` shift the weave one thread. */
    function onKeyDown(e: KeyboardEvent): void {
      dismissHook();
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const dir = e.key === ',' || e.key === '<' ? -1 : e.key === '.' || e.key === '>' ? 1 : 0;
      if (dir === 0 || pitchX <= 0) return;
      e.preventDefault();
      drag += dir * pitchX * 2;
      draggedRef.current = true;
      release();
    }

    stage?.addEventListener('pointerdown', onPointerDown);
    stage?.addEventListener('pointermove', onPointerMove);
    stage?.addEventListener('pointerup', onPointerUp);
    stage?.addEventListener('pointercancel', onPointerUp);
    stage?.addEventListener('keydown', onKeyDown);

    return () => {
      unsubscribe();
      if (hookTimer) clearTimeout(hookTimer);
      stage?.removeEventListener('pointerdown', onPointerDown);
      stage?.removeEventListener('pointermove', onPointerMove);
      stage?.removeEventListener('pointerup', onPointerUp);
      stage?.removeEventListener('pointercancel', onPointerUp);
      stage?.removeEventListener('keydown', onKeyDown);
    };
  }, [props.seed, props.reducedMotion]);

  // A room-owned, invisible, inert element: it carries the weave's state for
  // QA (data-weave, data-columns) and nothing else. The canvas is the room.
  return <div ref={rootRef} className={styles.root} aria-hidden="true" data-room="loom" />;
}

/** Clear a layer in device pixels, leaving the CSS-pixel transform intact. */
function clear(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}
