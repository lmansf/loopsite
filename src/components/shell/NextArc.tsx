'use client';

/**
 * src/components/shell/NextArc.tsx — the one-more control.
 *
 * Spec: design/05-build-spec.md §C.11. **OWNED BY WP3 from here on.**
 *
 * A real <a href="/?s=<next>"> bearing the next room's one-word name, fixed,
 * instant, in the easy thumb zone, and never relocating. It escalates on idle;
 * it never navigates on its own (§J.1).
 */

import type { MouseEvent } from 'react';
import { bySlug } from '@/sections/registry';
import { useLoop } from './LoopContext';

export function NextArc() {
  const { section, setSection } = useLoop();
  const current = bySlug(section);
  const next = current ? bySlug(current.next) : null;
  if (!next) return null;

  function go(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (next) setSection(next.id, 'push');
  }

  return (
    <a className="next-arc" href={`/?s=${next.id}`} onClick={go} data-next={next.id}>
      <span aria-hidden="true">{next.title}</span>
      <span className="u-sr">next room: {next.title}</span>
    </a>
  );
}
