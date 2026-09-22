'use client';

/**
 * src/sections/origin/Room.tsx — ORIGIN, the landing room. Owned by WP1.
 *
 * Spec: design/05-build-spec.md §D.1. This is the only room whose code is in
 * the landing bundle (index.ts imports it statically), so the first paint of
 * the room layer never waits for a fetch.
 *
 * Renders the bare ring on the near-black field:
 *   - the field: one radial gradient whose inner alpha follows node density
 *     (0.04 + 0.02 · min(n, 8) / 8), breathing ±10% on a 4000 ms sine keyed to
 *     phase — never more. Under reduced motion it breathes 0.80 ↔ 0.92 over 12 s.
 *   - on fire, a ripple from each node (0 → 64 px, 520 ms, --ease-exit). The
 *     seed node's pulse ripples too: the sweep passing it is the first thing
 *     the visitor sees the site do.
 *   - after the third node, a second ring fades in at 0.72 R over 900 ms at
 *     20% alpha, turning at 4/5 the rate with its own 2 px head. Polyrhythm,
 *     unannounced. Once unlocked it stays for the session.
 *
 * The blooms, glow and trail flare on fire belong to the ring layer.
 * Contract notes: one effect keyed on [seed, reducedMotion]; one draw callback
 * with the shared clock; props read through a ref inside the callback.
 */

import { useEffect, useRef } from 'react';
import { subscribeFrame } from '@/lib/clock';
import type { SectionProps } from '@/lib/types';
import { getSeed } from '@/components/ring/ring-state';
import { clearLayer, drawFieldCached, drawRipples, drawSecondRing, newFieldCache, nodePoint, type Ripple } from './field';
import {
  advanceSecondRing,
  breathe,
  crossed,
  fieldAlpha,
  originDepth,
  quantize12,
  SECOND_RING_AFTER,
  SECOND_RING_ALPHA,
  SECOND_RING_FADE_MS,
} from './logic';

/** Unlocked once per session: leaving and coming back does not take it away. */
let secondRingUnlocked = false;

export default function Room(props: SectionProps) {
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  const depthRef = useRef(0);
  const viewedRef = useRef(false);

  useEffect(() => {
    const first = propsRef.current;
    if (!viewedRef.current) {
      viewedRef.current = true;
      first.onExplore({ name: 'section_viewed', section: first.id });
    }

    const ripples: Ripple[] = [];
    let prevPhase = first.clock.phase;
    let phase2 = first.clock.phase;
    let ringAge = secondRingUnlocked ? SECOND_RING_FADE_MS : 0;
    let everFired = false;
    let bgCleared: CanvasRenderingContext2D | null = null;
    let lastAlpha = -1;
    let lastCtx: CanvasRenderingContext2D | null = null;
    let lastGeometry: SectionProps['geometry'] | null = null;
    const fieldCache = newFieldCache();

    const unsubscribe = subscribeFrame(() => {
      const p = propsRef.current;
      if (!p.visible) return;
      const { ctx, bg, geometry: g, clock, nodes, fired, reducedMotion } = p;
      if (!ctx || g.R <= 0) return;
      const dt = clock.dt;

      // --- ripples: every node the sweep crossed this frame, and the seed's pulse
      for (const ev of fired) {
        const pt = nodePoint(ev.node.a, ev.node.r, g);
        ripples.push({ x: pt.x, y: pt.y, age: 0 });
        everFired = true;
      }
      const seed = getSeed();
      if (seed && crossed(prevPhase, clock.phase, clock.dir, seed.a)) {
        const pt = nodePoint(seed.a, seed.r, g);
        ripples.push({ x: pt.x, y: pt.y, age: 0 });
      }
      prevPhase = clock.phase;

      // --- depth, monotonic, at most once per 0.25 step
      const depth = originDepth(nodes.length, everFired, secondRingUnlocked && ringAge >= SECOND_RING_FADE_MS);
      if (depth > depthRef.current) {
        depthRef.current = depth;
        p.onExplore({ name: 'depth_reached', section: p.id, depth });
      }

      // The field is drawn on the room layer so the still is a complete image
      // on the layer the calm-variant gate inspects; the background layer is
      // left clean for the corridor's pan. An idle frame — nothing moving and
      // the field's 8-bit alpha unchanged — repaints nothing at all.
      const alpha = Math.round(fieldAlpha(nodes.length) * breathe(clock.phase, clock.t, reducedMotion) * 255) / 255;
      const busy = ripples.length > 0 || secondRingUnlocked || nodes.length >= SECOND_RING_AFTER;
      if (!busy && alpha === lastAlpha && ctx === lastCtx && g === lastGeometry) return;
      lastAlpha = alpha;
      lastCtx = ctx;
      lastGeometry = g;
      if (bg && bgCleared !== bg) {
        clearLayer(bg);
        bgCleared = bg;
      }
      clearLayer(ctx);
      drawFieldCached(ctx, g, alpha, fieldCache);
      drawRipples(ctx, ripples, dt, reducedMotion);

      // --- the second ring, after the third node
      if (!secondRingUnlocked && nodes.length >= SECOND_RING_AFTER) {
        secondRingUnlocked = true;
        ringAge = 0;
        phase2 = clock.phase; // the two heads part company from here
      }
      if (secondRingUnlocked) {
        ringAge += dt;
        phase2 = advanceSecondRing(phase2, dt, clock.dir, clock.periodMs);
        const fade = reducedMotion ? 1 : Math.min(1, ringAge / SECOND_RING_FADE_MS);
        drawSecondRing(ctx, g, reducedMotion ? quantize12(phase2) : phase2, SECOND_RING_ALPHA * fade, reducedMotion);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [props.seed, props.reducedMotion]);

  return null;
}
