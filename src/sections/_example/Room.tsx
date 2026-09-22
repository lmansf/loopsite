'use client';

/**
 * src/sections/_example/Room.tsx — THE REFERENCE CLIENT ROOM.
 *
 * Read this file top to bottom before writing your own room. Every rule in
 * §F.3 ("Lifecycle rules, non-negotiable") is demonstrated here, and every one
 * of them is enforced by CI, by lint, or by a reviewer.
 *
 *   1. ALL setup happens in ONE useEffect, keyed on [seed, reducedMotion].
 *      Nothing else may re-run it.
 *   2. NEVER call requestAnimationFrame. Register a draw callback with the
 *      shared clock via `subscribeFrame`. There is one rAF in the whole site
 *      and `src/lib/clock.ts` owns it.
 *   3. `section_viewed` fires ONCE, on first activity. `depth_reached` fires at
 *      most once per 0.25 step, and depth only ever goes up.
 *   4. NEVER read window/document outside the effect. NEVER call matchMedia
 *      (use `props.reducedMotion`). NEVER touch localStorage (use
 *      `@/lib/storage`). Both of those are lint errors.
 *   5. Release everything in the cleanup.
 *   6. Under reducedMotion render a STILL, COMPLETE composition. Not a frozen
 *      frame of the animated one, and never an empty box.
 *      `tests/reduced-motion.spec.ts` screenshots every room and fails on a
 *      uniform image.
 *   7. NEVER draw on the ring layer. You get `props.ctx` (the room layer) and
 *      `props.bg` (the background layer). The ring belongs to RingStage.
 *   8. NEVER mutate `props.nodes`. Rooms read the node set; they never change it.
 *
 * HOW THE PROPS STAY CURRENT — this is the one thing that surprises people.
 * React re-renders this component only when something structural changes
 * (nodes, geometry, contexts, tier, motion, seed). It does NOT re-render at
 * 60 fps. `props.clock` and `props.fired` are stable object identities that the
 * ring's frame driver mutates in place, so they are always current. That is why
 * the effect keeps a `propsRef` and reads `propsRef.current` inside `draw`
 * instead of closing over the props it was created with.
 */

import { useEffect, useRef } from 'react';
import { subscribeFrame } from '@/lib/clock';
import { pointAt } from '@/lib/ring-geometry';
import { rgba } from '@/lib/tokens';
import { mulberry32 } from '@/lib/rng';
import type { SectionProps } from '@/lib/types';
import { depthFor, marksFor } from './logic';

export default function Room(props: SectionProps) {
  // Always current, never stale: an effect with NO dependency array runs after
  // every render, so `propsRef.current` is the latest props by the time the
  // next frame draws. (Assigning a ref during render is a React 19 lint error.)
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  // Per-room state that must survive frames lives in refs, never in useState:
  // a setState at 60 fps is a bug, not a style choice.
  const depthRef = useRef(0);
  const viewedRef = useRef(false);
  const startRevRef = useRef(0);

  useEffect(() => {
    // ---- 1. setup, once, keyed on [seed, reducedMotion] -------------------
    const first = propsRef.current;
    startRevRef.current = first.clock.revolution;

    // Deterministic randomness only: the same ?seed= must give the same room.
    const rnd = mulberry32(first.seed ^ 0x5eed);
    const jitter = Array.from({ length: 12 }, () => rnd() - 0.5);

    if (!viewedRef.current) {
      viewedRef.current = true;
      first.onExplore({ name: 'section_viewed', section: first.id });
    }

    // ---- 2. one draw callback, registered with the shared clock ----------
    const unsubscribe = subscribeFrame(() => {
      const p = propsRef.current;

      // Rooms MUST NOT draw when not visible. This is a hard budget rule.
      if (!p.visible) return;

      const { ctx, bg, geometry: g, clock, nodes, fired, reducedMotion, tier } = p;
      if (!ctx || !bg || g.R <= 0) return;

      // Tier only ever reduces work: fewer particles, less recursion, lower DPR.
      // A room that cannot hold 45 fps ships simpler, not later.
      const spokes = tier === 'low' ? 6 : tier === 'mid' ? 9 : 12;

      // ---- background layer ---------------------------------------------
      clear(bg);
      const density = 0.04 + 0.02 * (Math.min(nodes.length, 8) / 8);
      // A 10% luminance breathe, capped — never more (photosensitivity, §D.1).
      const breathe = reducedMotion ? 1 : 1 + 0.1 * Math.sin(clock.phase * Math.PI * 2);
      const grad = bg.createRadialGradient(g.cx, g.cy, g.R * 0.2, g.cx, g.cy, g.R * 1.9);
      grad.addColorStop(0, rgba('--c-accent', density * breathe));
      grad.addColorStop(1, rgba('--c-canvas', 0));
      bg.fillStyle = grad;
      bg.fillRect(0, 0, g.w, g.h);

      // ---- room layer -----------------------------------------------------
      clear(ctx);

      // The still composition. Under reduced motion this is ALL that is drawn,
      // and it is complete on its own: a finished figure, not a stripped one.
      for (let i = 0; i < spokes; i++) {
        const a = i / spokes + (jitter[i] ?? 0) * 0.004;
        const from = pointAt(a, 1, g);
        const to = pointAt(a, 6, g);
        ctx.strokeStyle = rgba('--c-border-strong', 0.35);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }

      // The visitor's own nodes, read through the room's pure logic.
      const marks = marksFor(nodes, clock.revolution);
      for (const m of marks) {
        const point = pointAt(m.a, m.level, g);
        ctx.strokeStyle = rgba('--c-accent', 0.2 + 0.5 * m.weight);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(g.cx, g.cy);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }

      // The moving part. Reduced motion still gets a mark on every step — the
      // clock quantizes `phase` to twelve steps for us, so there is nothing to
      // branch on here beyond skipping the smooth flourish.
      const head = pointAt(clock.phase, 4, g);
      ctx.fillStyle = rgba('--c-accent-hi', reducedMotion ? 0.7 : 1);
      ctx.beginPath();
      ctx.arc(head.x, head.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // `fired` holds the nodes the sweep crossed on THIS frame, with how late
      // each one was in milliseconds. This is where a room reacts to the beat.
      for (const ev of fired) {
        const point = pointAt(ev.node.a, ev.node.r, g);
        ctx.strokeStyle = rgba('--c-accent-3', 0.6);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(point.x, point.y, reducedMotion ? 18 : 12, 0, Math.PI * 2);
        ctx.stroke();
      }

      // ---- 3. depth, monotonic, at most once per 0.25 step ----------------
      const depth = depthFor(nodes.length, clock.revolution - startRevRef.current);
      if (depth > depthRef.current) {
        depthRef.current = depth;
        p.onExplore({ name: 'depth_reached', section: p.id, depth });
      }
    });

    // ---- 5. release everything ------------------------------------------
    return () => {
      unsubscribe();
    };
  }, [props.seed, props.reducedMotion]);

  // A room renders no DOM of its own unless it needs a real control. The canvas
  // it draws on is owned by the stage and already has its text equivalent.
  return null;
}

/** Clear a layer in device pixels, leaving the CSS-pixel transform intact. */
function clear(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}
