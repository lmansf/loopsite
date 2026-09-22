'use client';

/**
 * src/sections/slow/Room.tsx — SLOW (§C.13, §D.13).
 *
 * Trigger: a two-pointer pinch-out centred inside the ring that grows the
 * distance >= 1.6×, or a press-and-hold within 0.25 R of the centre for
 * 1200 ms. Keyboard: Shift+S. Effect: periodMs eases 4000 -> 16000 ms over
 * 1200 ms with --ease-loop; persists; the same gesture eases it back.
 *
 * The centre of the ring is reserved for this (§C.3): the ring itself does
 * nothing there, so holding it is never mistaken for placing.
 */

import { useEffect, useRef } from 'react';
import { getFrame, setPeriod, subscribeFrame, SWEEP_MS } from '@/lib/clock';
import { markFound, readState, writeState } from '@/lib/storage';
import { claim, geometryOf, inStage, localPoint, release, stageEl, type HiddenProps } from '../garden/stage';

const CENTRE = 0.25;
const HOLD_MS = 1200;
const MOVE_TOL_PX = 10;
const PINCH = 1.6;
const SLOW_MS = 16_000;
const EASE_MS = 1200;

interface Hold {
  id: number;
  t0: number;
  x: number;
  y: number;
}

export default function Room(props: HiddenProps) {
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });
  const markRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!claim('slow')) return;
    const stage = stageEl();
    if (!stage) {
      release('slow');
      return;
    }
    const mark = markRef.current;
    let on = readState().slow;
    let hold: Hold | null = null;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch: { d0: number; fired: boolean } | null = null;

    function reflect(): void {
      if (mark) mark.dataset.on = String(on);
    }

    function toggle(): void {
      on = !on;
      setPeriod(on ? SLOW_MS : SWEEP_MS, EASE_MS);
      writeState({ slow: on });
      markFound('slow');
      const p = propsRef.current;
      p.onExplore({ name: 'collectible_found', section: p.id });
      reflect();
    }

    function onPointerDown(e: PointerEvent): void {
      if (!inStage(e.target)) return;
      const g = geometryOf(propsRef.current);
      if (g.R <= 0) return;
      const pt = localPoint(e, stage!);
      pointers.set(e.pointerId, pt);
      if (pointers.size === 2) {
        hold = null;
        const [a, b] = [...pointers.values()] as [{ x: number; y: number }, { x: number; y: number }];
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        if (Math.hypot(mx - g.cx, my - g.cy) < g.R) pinch = { d0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), fired: false };
        return;
      }
      if (pointers.size === 1 && Math.hypot(pt.x - g.cx, pt.y - g.cy) <= CENTRE * g.R) {
        hold = { id: e.pointerId, t0: getFrame().t, x: pt.x, y: pt.y };
      }
    }

    function onPointerMove(e: PointerEvent): void {
      if (!pointers.has(e.pointerId)) return;
      const pt = localPoint(e, stage!);
      pointers.set(e.pointerId, pt);
      if (hold && e.pointerId === hold.id && Math.hypot(pt.x - hold.x, pt.y - hold.y) > MOVE_TOL_PX) hold = null;
      if (pinch && !pinch.fired && pointers.size === 2) {
        const [a, b] = [...pointers.values()] as [{ x: number; y: number }, { x: number; y: number }];
        if (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d0 >= PINCH) {
          pinch.fired = true;
          toggle();
        }
      }
    }

    function onPointerEnd(e: PointerEvent): void {
      pointers.delete(e.pointerId);
      if (hold && e.pointerId === hold.id) hold = null;
      if (pointers.size < 2) pinch = null;
    }

    function onKeyDown(e: KeyboardEvent): void {
      if (!inStage(e.target)) return;
      if (!e.shiftKey || (e.key !== 'S' && e.code !== 'KeyS')) return;
      e.preventDefault();
      e.stopPropagation();
      toggle();
    }

    const unsubFrame = subscribeFrame((f) => {
      if (hold && f.t - hold.t0 >= HOLD_MS) {
        hold = null;
        toggle();
      }
    });

    reflect();
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', onPointerEnd, true);
    window.addEventListener('pointercancel', onPointerEnd, true);
    window.addEventListener('keydown', onKeyDown, true);

    return () => {
      unsubFrame();
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerEnd, true);
      window.removeEventListener('pointercancel', onPointerEnd, true);
      window.removeEventListener('keydown', onKeyDown, true);
      release('slow');
    };
  }, []);

  return <span ref={markRef} data-hidden="slow" data-on="false" hidden />;
}
