'use client';

/**
 * src/components/ring/PlaceholderRoom.tsx — the reserved-slot renderer.
 *
 * WP0 registers every one of the twelve rooms and the five hidden destinations
 * so that the site is navigable end to end, and every QA suite is meaningful,
 * before a single room agent has started. Each room's `Room.tsx` delegates
 * here until its owner replaces the file.
 *
 * **BUILDERS: delete this import from your room's Room.tsx and draw your own
 * room.** Nothing else in the site depends on this component.
 *
 * It is deliberately minimal but never blank: it obeys every rule in §F.3 —
 * one effect, no rAF of its own, no matchMedia, no localStorage, no mutation
 * of the node set, a still and complete composition under reduced motion, and
 * `section_viewed` / `depth_reached` reported through `onExplore`.
 */

import { useEffect, useRef } from 'react';
import { subscribeFrame } from '@/lib/clock';
import { pointAt, radiusOfLevel } from '@/lib/ring-geometry';
import { rgba } from '@/lib/tokens';
import type { SectionProps } from '@/lib/types';

export function PlaceholderRoom(props: SectionProps & { label: string }) {
  const propsRef = useRef(props);
  const depthRef = useRef(0);
  // React 19 lint forbids assigning a ref during render; the sanctioned pattern
  // is an effect with no dependency array, which runs after every render.
  useEffect(() => {
    propsRef.current = props;
  });

  useEffect(() => {
    const p0 = propsRef.current;
    p0.onExplore({ name: 'section_viewed', section: p0.id });

    const unsub = subscribeFrame(() => {
      const p = propsRef.current;
      if (!p.visible) return;
      const { ctx, bg, geometry: g, clock, nodes, reducedMotion } = p;
      if (!ctx || !bg || g.R <= 0) return;

      const phase = clock.phase;

      // --- background: one radial gradient whose luminance follows node density
      const alpha = 0.04 + 0.02 * (Math.min(nodes.length, 8) / 8);
      const breathe = reducedMotion ? 1 : 1 + 0.1 * Math.sin(phase * Math.PI * 2);
      bg.save();
      bg.setTransform(1, 0, 0, 1, 0, 0);
      bg.clearRect(0, 0, bg.canvas.width, bg.canvas.height);
      bg.restore();
      const grad = bg.createRadialGradient(g.cx, g.cy, g.R * 0.2, g.cx, g.cy, g.R * 1.9);
      grad.addColorStop(0, rgba('--c-accent', alpha * breathe));
      grad.addColorStop(1, rgba('--c-canvas', 0));
      bg.fillStyle = grad;
      bg.fillRect(0, 0, g.w, g.h);

      // --- room layer: the visitor's own nodes, read as spokes
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();

      // A twelve-spoke ground figure. Under reduced motion it is drawn once per
      // step, in its exact position — a complete image, never an empty box.
      const steps = 12;
      for (let i = 0; i < steps; i++) {
        const a = i / steps;
        const inner = pointAt(a, 2, g);
        const outer = pointAt(a, 5, g);
        const near = Math.abs(((a - phase + 1.5) % 1) - 0.5);
        ctx.strokeStyle = rgba('--c-border-strong', 0.25 + 0.4 * (1 - Math.min(1, near * 6)));
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(inner.x, inner.y);
        ctx.lineTo(outer.x, outer.y);
        ctx.stroke();
      }

      for (const n of nodes) {
        const p1 = pointAt(n.a, n.r, g);
        ctx.strokeStyle = rgba('--c-accent', 0.3);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(g.cx, g.cy);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
        ctx.fillStyle = rgba('--c-accent-2', 0.7);
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // one calm circle at the mid radius so the room is never empty
      ctx.strokeStyle = rgba('--c-border', 0.8);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(g.cx, g.cy, radiusOfLevel(1, g.R), 0, Math.PI * 2);
      ctx.stroke();

      // --- depth, at most once per 0.25 step
      const depth = Math.min(1, Math.floor(Math.min(nodes.length, 4) / 1) * 0.25);
      if (depth > depthRef.current) {
        depthRef.current = depth;
        p.onExplore({ name: 'depth_reached', section: p.id, depth });
      }
    });

    return () => {
      unsub();
    };
  }, [props.seed, props.reducedMotion]);

  return null;
}
