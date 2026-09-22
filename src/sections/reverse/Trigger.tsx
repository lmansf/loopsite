
/**
 * src/sections/reverse/Trigger.tsx — REVERSE (§C.13, §D.13).
 *
 * Trigger: pointerdown within 18 px of the sweep head, then drag backwards —
 * against the sweep — through >= 340° of cumulative rotation within 6 s.
 * Keyboard: Shift+← held for 4 s. Effect: clock.dir flips; it persists in
 * storage and the same gesture flips it back. The ring reads `dir` for its
 * trail and the Ringway for its marker colour; nothing is drawn here.
 *
 * A pointerdown on the head sits on the band, so the ring places a node under
 * it. That node is the gesture's own; when the gesture completes it is removed
 * again — the head was grabbed, nothing was placed.
 */

import { useEffect, useRef } from 'react';
import { getFrame, setDirection, subscribeFrame } from '@/lib/clock';
import { angleAt, pointAt } from '@/lib/ring-geometry';
import { getNodes, removeNode } from '@/lib/ring-store';
import { markFound, writeState } from '@/lib/storage';
import type { RingNode } from '@/lib/types';
import { claim, geometryOf, inStage, localPoint, release, stageEl, type HiddenProps } from '../garden/stage';

/** how close to the head a pointerdown must land */
const HEAD_PX = 18;
/** cumulative backwards rotation, in turns */
const TURNS = 340 / 360;
/** the gesture must complete within this window */
const WINDOW_MS = 6000;
/** keyboard: Shift+← held this long */
const HOLD_MS = 4000;

interface Drag {
  id: number;
  t0: number;
  last: number;
  cum: number;
  before: readonly RingNode[];
  /** id of the node the pointerdown placed; null once known to be none */
  placed: string | null | undefined;
}

export default function Room(props: HiddenProps) {
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });
  const markRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!claim('reverse')) return;
    const stage = stageEl();
    if (!stage) {
      release('reverse');
      return;
    }
    const mark = markRef.current;
    let drag: Drag | null = null;
    let holdSince = -1;

    function reflect(): void {
      if (mark) mark.dataset.on = String(getFrame().dir === -1);
    }

    function flip(): void {
      const next = getFrame().dir === 1 ? -1 : 1;
      setDirection(next);
      writeState({ reverse: next === -1 });
      markFound('reverse');
      const p = propsRef.current;
      p.onExplore({ name: 'collectible_found', section: p.id });
      reflect();
    }

    function onPointerDown(e: PointerEvent): void {
      if (!inStage(e.target)) return;
      const g = geometryOf(propsRef.current);
      if (g.R <= 0) return;
      const pt = localPoint(e, stage!);
      const f = getFrame();
      const head = pointAt(f.phase, 8, g);
      if (Math.hypot(head.x - pt.x, head.y - pt.y) > HEAD_PX) return;
      drag = {
        id: e.pointerId,
        t0: f.t,
        last: angleAt(pt.x, pt.y, g),
        cum: 0,
        before: getNodes(),
        placed: undefined,
      };
    }

    function onPointerMove(e: PointerEvent): void {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.placed === undefined) {
        const before = drag.before;
        const added = getNodes().find((n) => !before.includes(n));
        drag.placed = added ? added.id : null;
      }
      const f = getFrame();
      if (f.t - drag.t0 > WINDOW_MS) {
        drag = null;
        return;
      }
      const g = geometryOf(propsRef.current);
      const pt = localPoint(e, stage!);
      const a = angleAt(pt.x, pt.y, g);
      let d = a - drag.last;
      if (d > 0.5) d -= 1;
      else if (d < -0.5) d += 1;
      drag.last = a;
      // backwards is against the sweep, whichever way it is running
      drag.cum += -f.dir * d;
      if (drag.cum >= TURNS) {
        const placed = drag.placed;
        drag = null;
        if (placed) removeNode(placed);
        flip();
      }
    }

    function onPointerEnd(e: PointerEvent): void {
      if (drag && e.pointerId === drag.id) drag = null;
    }

    function onKeyDown(e: KeyboardEvent): void {
      if (!inStage(e.target)) return;
      if (e.key !== 'ArrowLeft' || !e.shiftKey) return;
      e.preventDefault();
      e.stopPropagation();
      if (holdSince < 0) holdSince = getFrame().t;
    }

    function onKeyUp(e: KeyboardEvent): void {
      if (e.key === 'ArrowLeft' || e.key === 'Shift') holdSince = -1;
    }

    function onBlur(): void {
      holdSince = -1;
      drag = null;
    }

    const unsubFrame = subscribeFrame((f) => {
      if (holdSince >= 0 && f.t - holdSince >= HOLD_MS) {
        holdSince = -1;
        flip();
      }
    });

    reflect();
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', onPointerEnd, true);
    window.addEventListener('pointercancel', onPointerEnd, true);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);

    return () => {
      unsubFrame();
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerEnd, true);
      window.removeEventListener('pointercancel', onPointerEnd, true);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
      release('reverse');
    };
  }, []);

  return <span ref={markRef} data-hidden="reverse" data-on="false" hidden />;
}
