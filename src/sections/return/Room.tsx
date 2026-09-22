'use client';

/**
 * src/sections/return/Room.tsx — RETURN. ORIGIN again, but lit. Owned by WP1.
 *
 * Spec: design/05-build-spec.md §D.12. Same ring, same nodes, still going —
 * with every difference earned rather than decorated:
 *   - the field at full amplitude (A = 0.06) carrying a faint trace of every
 *     visited room: a 1 px arc at 1.3 R, one twelfth each, at that room's notch;
 *   - the second ring present from the first frame;
 *   - the door: a 14° gap in the ring stroke at 12 o'clock with a threshold
 *     line (drawn by the ring layer at this room's request, ring-state.ts) and
 *     a real <button aria-label="open the rooms"> that expands into a
 *     full-stage map of twelve labelled links. Esc closes it and returns focus.
 *     The door does not exist on a first visit to ORIGIN;
 *   - the final line, once per visitor, when the twelfth notch lights:
 *     `it was always going to come back.` — the last copy on the site, with
 *     nothing after it and no call to action attached.
 *   - `state.returns++` on arrival.
 *
 * The room draws on the room layer only; the ring layer stays RingStage's.
 */

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { subscribeFrame } from '@/lib/clock';
import { readState, writeState } from '@/lib/storage';
import type { SectionProps } from '@/lib/types';
import { getSeed, setRingDoor } from '@/components/ring/ring-state';
import { useLoop } from '@/components/shell/LoopContext';
import {
  clearLayer,
  drawFieldCached,
  drawRipples,
  drawSecondRing,
  drawTraces,
  newFieldCache,
  nodePoint,
  type Ripple,
} from '../origin/field';
import {
  advanceSecondRing,
  breathe,
  crossed,
  FIELD_FULL,
  quantize12,
  SECOND_RING_ALPHA,
} from '../origin/logic';
import {
  allLit,
  FINAL_LINE,
  isLit,
  litNotches,
  returnDepth,
  ROOM_ORDER,
} from './logic';

/**
 * The final line is gated by `state.returns` and appears once per visitor
 * (§D.12): it is eligible only in the session in which RETURN was first
 * reached, and it shows once in that session.
 */
let eligibleForFinalLine: boolean | null = null;
let finalLineShown = false;

export default function Room(props: SectionProps) {
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  const { setSection, section, visited } = useLoop();
  const [open, setOpen] = useState(false);
  const doorRef = useRef<HTMLButtonElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const depthRef = useRef(0);
  const viewedRef = useRef(false);
  const arrivedRef = useRef(false);
  const doorOpenedRef = useRef(false);

  /* ---------------------------------------------------------- arrival */

  useEffect(() => {
    if (arrivedRef.current) return;
    arrivedRef.current = true;
    const s = readState();
    if (eligibleForFinalLine === null) eligibleForFinalLine = s.returns === 0;
    writeState({ returns: s.returns + 1 });
  }, []);

  /* ---------------------------------------------------------- the draw */

  useEffect(() => {
    const first = propsRef.current;
    if (!viewedRef.current) {
      viewedRef.current = true;
      first.onExplore({ name: 'section_viewed', section: first.id });
    }
    setRingDoor(true);

    const ripples: Ripple[] = [];
    let prevPhase = first.clock.phase;
    let phase2 = first.clock.phase;
    let bgCleared: CanvasRenderingContext2D | null = null;
    let lastVisited: readonly string[] | null = null;
    let notches: number[] = [];
    const fieldCache = newFieldCache();

    const unsubscribe = subscribeFrame(() => {
      const p = propsRef.current;
      if (!p.visible) return;
      const { ctx, bg, geometry: g, clock, fired, reducedMotion } = p;
      if (!ctx || g.R <= 0) return;
      const dt = clock.dt;

      if (bg && bgCleared !== bg) {
        clearLayer(bg);
        bgCleared = bg;
      }
      clearLayer(ctx);
      drawFieldCached(ctx, g, FIELD_FULL * breathe(clock.phase, clock.t, reducedMotion), fieldCache);

      // --- traces of everywhere the visitor has been
      const vis = readState().visited;
      if (vis !== lastVisited) {
        lastVisited = vis;
        notches = litNotches(vis);
      }
      drawTraces(ctx, g, notches);

      // --- ripples
      for (const ev of fired) {
        const pt = nodePoint(ev.node.a, ev.node.r, g);
        ripples.push({ x: pt.x, y: pt.y, age: 0 });
      }
      const seed = getSeed();
      if (seed && crossed(prevPhase, clock.phase, clock.dir, seed.a)) {
        const pt = nodePoint(seed.a, seed.r, g);
        ripples.push({ x: pt.x, y: pt.y, age: 0 });
      }
      prevPhase = clock.phase;
      drawRipples(ctx, ripples, dt, reducedMotion);

      // --- the second ring, from the first frame
      phase2 = advanceSecondRing(phase2, dt, clock.dir, clock.periodMs);
      drawSecondRing(ctx, g, reducedMotion ? quantize12(phase2) : phase2, SECOND_RING_ALPHA, reducedMotion);

      // --- the final line, once, when the twelfth notch lights. It fades in
      //     over 900 ms (160 ms under reduced motion) by CSS: ring.css lengthens
      //     the caption's entrance while html[data-final-line] is set.
      if (eligibleForFinalLine && !finalLineShown && allLit(vis)) {
        finalLineShown = true;
        document.documentElement.setAttribute('data-final-line', '');
        p.say(FINAL_LINE);
      }

      // --- depth, monotonic, at most once per 0.25 step
      const depth = returnDepth(notches.length >= 2, doorOpenedRef.current, finalLineShown);
      if (depth > depthRef.current) {
        depthRef.current = depth;
        p.onExplore({ name: 'depth_reached', section: p.id, depth });
      }
    });

    return () => {
      unsubscribe();
      setRingDoor(false);
      document.documentElement.removeAttribute('data-final-line');
    };
  }, [props.seed, props.reducedMotion]);

  /* ---------------------------------------------------------- the door */

  useEffect(() => {
    if (!open) return;
    const firstLink = mapRef.current?.querySelector<HTMLAnchorElement>('a');
    firstLink?.focus();
  }, [open]);

  const openDoor = useCallback(() => {
    doorOpenedRef.current = true;
    setOpen(true);
  }, []);

  const closeDoor = useCallback(() => {
    setOpen(false);
    // return focus to the trigger (§C.12 Esc rule)
    afterCommit(() => doorRef.current?.focus());
  }, []);

  const onMapKey = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeDoor();
      }
    },
    [closeDoor],
  );

  const go = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, slug: string) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      setOpen(false);
      setSection(slug, 'push');
    },
    [setSection],
  );

  return (
    <>
      <button
        ref={doorRef}
        type="button"
        className="rt-door"
        aria-label="open the rooms"
        aria-expanded={open}
        aria-controls="return-map"
        data-control="door"
        onClick={openDoor}
      />
      {open ? (
        <div
          id="return-map"
          ref={mapRef}
          className="rt-map"
          role="dialog"
          aria-modal="true"
          aria-label="rooms"
          onKeyDown={onMapKey}
        >
          {ROOM_ORDER.map((slug) => {
            const lit = isLit(slug, visited);
            return (
              <a
                key={slug}
                href={`/?s=${slug}`}
                data-visited={String(lit)}
                aria-current={slug === section ? 'page' : undefined}
                onClick={(e) => go(e, slug)}
              >
                {slug}
                <span className="u-sr"> — {lit ? 'visited' : 'not yet visited'}</span>
              </a>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

/** Focus after React has committed the close; a plain microtask is too early. */
function afterCommit(fn: () => void): void {
  setTimeout(fn, 0);
}
