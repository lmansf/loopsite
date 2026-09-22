'use client';

/**
 * src/components/shell/NextArc.tsx — the one-more control.
 *
 * Spec: design/05-build-spec.md §C.11. **WP3.**
 *
 * A 96 px-radius, 120° arc bearing the NEXT room's one-word name on a
 * textPath, with a small traveller parked at its start. It is a real
 * <a href="/?s=<next>"> with a ≥48 px tall hit area, fixed, instant, and it
 * never relocates (rubric D4). After the room's trick has landed and the
 * visitor has been idle for 4 s it escalates — the arc fills, the label goes
 * to full opacity, the traveller walks the arc once — and it never, ever
 * navigates on its own (§J.1).
 *
 * Geometry: a 208×64 box; the arc is centred at (104, 108) with radius 96,
 * so a 120° span runs from (21, 60) over the top (104, 12) to (187, 60).
 */

import type { MouseEvent } from 'react';
import { bySlug } from '@/sections/registry';
import { useLoop } from './LoopContext';

const ARC = 'M 21 60 A 96 96 0 0 1 187 60';

export function NextArc() {
  const { section, setSection, escalated } = useLoop();
  const current = bySlug(section);
  const next = current ? bySlug(current.next) : null;
  if (!next) return null;

  function go(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (next) setSection(next.id, 'push'); // a deliberate act: pushState (§C.10)
  }

  return (
    <a
      className="next-arc"
      href={`/?s=${next.id}`}
      onClick={go}
      data-next={next.id}
      data-escalated={escalated ? 'true' : 'false'}
    >
      <svg viewBox="0 0 208 64" aria-hidden="true" focusable="false">
        <defs>
          <path id="next-arc-path" d={ARC} pathLength={1} />
        </defs>
        <use href="#next-arc-path" className="track" />
        <use href="#next-arc-path" className="fill" />
        <text textAnchor="middle" dy="-7">
          <textPath href="#next-arc-path" startOffset="50%">
            {next.title}
          </textPath>
        </text>
      </svg>
      <span className="traveller" aria-hidden="true" />
      <span className="u-sr">next room: {next.title}</span>
    </a>
  );
}
