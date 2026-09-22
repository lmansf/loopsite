'use client';

/**
 * src/components/shell/Ringway.tsx — persistent navigation. Never a navbar.
 *
 * Spec: design/05-build-spec.md §C.5. **OWNED BY WP3 from here on.**
 *
 * Twelve notches. Each is a real <a href="/?s=<slug>"> inside
 * <nav aria-label="rooms">, so it works with zero JS, with middle-click and
 * with a screen reader. State is never encoded by colour alone: visited notches
 * are filled AND carry an inner ring; the current notch also carries a marker
 * dot and aria-current="page".
 *
 * Endowed progress: ORIGIN's notch is lit from the first frame, because the
 * visitor has genuinely already been somewhere.
 */

import type { MouseEvent } from 'react';
import { ROOMS } from '@/sections/registry';
import { useLoop } from './LoopContext';

export function Ringway() {
  const { section, setSection, visited, collected } = useLoop();

  function go(e: MouseEvent<HTMLAnchorElement>, slug: string) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setSection(slug, 'push'); // a deliberate act: pushState (§C.10)
  }

  const found = collected.length;

  return (
    <nav aria-label="rooms" className="ringway">
      {ROOMS.map((room) => {
        const isVisited = visited.includes(room.id) || room.id === 'origin';
        const isCurrent = room.id === section;
        return (
          <a
            key={room.id}
            href={`/?s=${room.id}`}
            data-slug={room.id}
            data-visited={String(isVisited)}
            aria-current={isCurrent ? 'page' : undefined}
            onClick={(e) => go(e, room.id)}
          >
            <span className="notch" aria-hidden="true" />
            <span className="u-sr">
              {room.title} — {isVisited ? 'visited' : 'not yet visited'}
            </span>
          </a>
        );
      })}
      {found >= 1 ? (
        <span className="hub u-num" aria-label={`${found} of 5 found`}>
          {found}/5
        </span>
      ) : null}
    </nav>
  );
}
