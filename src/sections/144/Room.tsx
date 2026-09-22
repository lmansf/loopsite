'use client';

/**
 * src/sections/144/Room.tsx — 144 (§C.13, §D.13).
 *
 * Trigger: visits[slug] >= 12 for all twelve rooms — twelve times twelve.
 * Effect: the ring becomes a working clock face. The twelve notch angles are
 * the hours (the current hour's carries a 2 px marker), a 1 px minute hand
 * appears, and the sweep gains a seconds hand read from `Date`. Local time
 * only: no locale lookup, no time-zone call, no geolocation.
 *
 * It is permanent once found; tapping the Ringway hub, or the centre of the
 * ring, turns the face off and on again for the session.
 *
 * The face is painted on the room layer after the room has drawn, so it sits
 * over every room and under the ring itself. The Ringway is not this
 * package's to redraw, so the face lives on the main ring, whose notch
 * angles are the same twelve.
 */

import { useEffect, useRef } from 'react';
import { getFrame, subscribeFrame } from '@/lib/clock';
import { pointAt } from '@/lib/ring-geometry';
import { markFound, readState } from '@/lib/storage';
import { rgba } from '@/lib/tokens';
import { ROOMS } from '@/sections/registry';
import {
  claim,
  geometryOf,
  inStage,
  localPoint,
  release,
  roomLayerOf,
  stageEl,
  type HiddenProps,
} from '../garden/stage';

const VISITS_NEEDED = 12;
const CHECK_MS = 1000;
/** a tap at the centre shorter than this, and steadier than 10 px, toggles the face */
const TAP_MS = 400;
const TAP_TOL_PX = 10;
const CENTRE = 0.25;
/** draw after every room (rooms use the default priority 0) */
const AFTER_ROOMS = 1000;

export function allVisited(visits: Record<string, number>): boolean {
  for (const room of ROOMS) {
    if ((visits[room.id] ?? 0) < VISITS_NEEDED) return false;
  }
  return true;
}

export default function Room(props: HiddenProps) {
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });
  const markRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!claim('144')) return;
    const stage = stageEl();
    if (!stage) {
      release('144');
      return;
    }
    const mark = markRef.current;
    let collected = readState().collected.includes('144');
    let on = collected;
    let lastCheck = -Infinity;
    let tap: { id: number; t0: number; x: number; y: number } | null = null;

    function reflect(): void {
      if (mark) mark.dataset.on = String(on);
    }

    function found(): void {
      collected = true;
      on = true;
      markFound('144');
      const p = propsRef.current;
      p.onExplore({ name: 'collectible_found', section: p.id });
      reflect();
    }

    function toggle(): void {
      if (!collected) return;
      on = !on;
      reflect();
    }

    function drawFace(ctx: CanvasRenderingContext2D, reduced: boolean): void {
      const g = geometryOf(propsRef.current);
      if (g.R <= 0) return;
      const now = new Date();
      const ms = now.getMilliseconds();
      const s = now.getSeconds() + (reduced ? 0 : ms / 1000);
      const m = now.getMinutes() + s / 60;
      const hour = now.getHours() % 12;

      ctx.save();
      // hours: the twelve notch angles, just outside the outermost node level
      for (let i = 0; i < 12; i++) {
        const a = i / 12;
        const from = pointAt(a, 15.6, g);
        const to = pointAt(a, i === hour ? 16.8 : 16.3, g);
        ctx.lineWidth = i === hour ? 2 : 1;
        ctx.strokeStyle = i === hour ? rgba('--c-text', 0.9) : rgba('--c-border-strong', 0.9);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }
      // minutes: one hairline hand from the centre
      const mh = pointAt(m / 60, 0, g);
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba('--c-text-secondary', 0.7);
      ctx.beginPath();
      ctx.moveTo(g.cx, g.cy);
      ctx.lineTo(mh.x, mh.y);
      ctx.stroke();
      // seconds: a hairline to the ring and a second head sitting on it
      const sh = pointAt(s / 60, 8, g);
      ctx.strokeStyle = rgba('--c-accent-hi', 0.45);
      ctx.beginPath();
      ctx.moveTo(g.cx, g.cy);
      ctx.lineTo(sh.x, sh.y);
      ctx.stroke();
      ctx.fillStyle = rgba('--c-accent-hi', 0.9);
      ctx.beginPath();
      ctx.arc(sh.x, sh.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba('--c-text', 0.8);
      ctx.beginPath();
      ctx.arc(g.cx, g.cy, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const unsubFrame = subscribeFrame((f) => {
      if (!collected && f.t - lastCheck >= CHECK_MS) {
        lastCheck = f.t;
        if (allVisited(readState().visits)) found();
      }
      if (!on) return;
      const ctx = roomLayerOf(propsRef.current);
      if (ctx) drawFace(ctx, propsRef.current.reducedMotion);
    }, AFTER_ROOMS);

    function onClick(e: MouseEvent): void {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest('nav[aria-label="rooms"] .hub')) toggle();
    }

    function onPointerDown(e: PointerEvent): void {
      if (!collected || !inStage(e.target)) return;
      const g = geometryOf(propsRef.current);
      const pt = localPoint(e, stage!);
      if (Math.hypot(pt.x - g.cx, pt.y - g.cy) > CENTRE * g.R) return;
      tap = { id: e.pointerId, t0: getFrame().t, x: pt.x, y: pt.y };
    }

    function onPointerUp(e: PointerEvent): void {
      if (!tap || e.pointerId !== tap.id) return;
      const pt = localPoint(e, stage!);
      const quick = getFrame().t - tap.t0 <= TAP_MS;
      const steady = Math.hypot(pt.x - tap.x, pt.y - tap.y) <= TAP_TOL_PX;
      tap = null;
      if (quick && steady) toggle();
    }

    function onPointerCancel(): void {
      tap = null;
    }

    reflect();
    document.addEventListener('click', onClick);
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('pointercancel', onPointerCancel, true);

    return () => {
      unsubFrame();
      document.removeEventListener('click', onClick);
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('pointercancel', onPointerCancel, true);
      release('144');
    };
  }, []);

  return <span ref={markRef} data-hidden="144" data-on="false" hidden />;
}
