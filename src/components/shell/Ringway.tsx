'use client';

/**
 * src/components/shell/Ringway.tsx — persistent navigation. Never a navbar.
 *
 * Spec: design/05-build-spec.md §C.5. **WP3.**
 *
 * Twelve notches. Each is a real <a href="/?s=<slug>"> inside
 * <nav aria-label="rooms">, so it works with zero JS, with middle-click and
 * with a screen reader. State is never encoded by colour alone: visited
 * notches are filled AND carry an inner ring; the current notch also carries
 * a marker dot and aria-current="page"; the visited state is text in the
 * accessibility tree.
 *
 * Desktop: a vertical dial pinned right, twelve ticks on a 96 px-tall arc.
 * Mobile: a thumb-arc of ≥44 px targets pinned to the bottom safe area.
 * The arrangement is CSS (shell.css); this file only sets the per-notch
 * bow so each layout can curve.
 *
 * Endowed progress: ORIGIN's notch is lit from the first frame, because the
 * visitor has genuinely already been somewhere.
 */

import type { CSSProperties, MouseEvent } from 'react';
import { ROOMS } from '@/sections/registry';
import { useLoop } from './LoopContext';

const N = ROOMS.length;

/** A shallow bow, 0 at the ends and 1 in the middle, over `count` slots. */
function bow(i: number, count: number): number {
  const mid = (count - 1) / 2;
  const x = (i - mid) / mid;
  return Math.max(0, 1 - x * x);
}

export function Ringway({ complete = false }: { complete?: boolean }) {
  const { section, setSection, visited, collected, ringwayShown, navDir, lockIn } = useLoop();

  function go(e: MouseEvent<HTMLAnchorElement>, slug: string) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setSection(slug, 'push'); // a deliberate act: pushState (§C.10)
  }

  const found = collected.length;

  return (
    <nav
      aria-label="rooms"
      className="ringway"
      data-shown={String(ringwayShown)}
      data-nav-dir={navDir ?? undefined}
      data-complete={complete ? 'true' : undefined}
    >
      <div className="notches">
        {ROOMS.map((room, i) => {
          const isVisited = visited.includes(room.id) || room.id === 'origin';
          const isCurrent = room.id === section;
          const style = {
            '--i': i,
            '--bow12': bow(i, N).toFixed(3),
            '--bow6': bow(i % 6, 6).toFixed(3),
          } as CSSProperties;
          return (
            <a
              key={room.id}
              href={`/?s=${room.id}`}
              data-slug={room.id}
              data-visited={String(isVisited)}
              data-lock={lockIn === room.id ? 'true' : undefined}
              aria-current={isCurrent ? 'page' : undefined}
              onClick={(e) => go(e, room.id)}
              style={style}
            >
              <span className="notch" aria-hidden="true" />
              <span className="label" aria-hidden="true">
                {room.title}
              </span>
              <span className="u-sr">
                {room.title} — {isVisited ? 'visited' : 'not yet visited'}
              </span>
            </a>
          );
        })}
      </div>
      {found >= 1 ? (
        <span className="hub u-num" data-found={found}>
          {found}/5
        </span>
      ) : null}
    </nav>
  );
}
