'use client';

/**
 * src/components/shell/Corridor.tsx — the twelve server-rendered room shells.
 *
 * Spec: design/05-build-spec.md §C.11, §F.6. **OWNED BY WP3 from here on.**
 *
 * Without JS this is a plain, readable, scrollable document: all twelve shells
 * in order, each with its <h2>, its hook line and a link to the next. With JS
 * (html[data-loop-js], set before first paint) it collapses to 100dvh with
 * only the active shell visible — no reflow, CLS 0.
 */

import { useEffect, useRef, type ReactNode } from 'react';

export function Corridor({ section, children }: { section: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const shells = el.querySelectorAll<HTMLElement>('.room-shell');
    for (const shell of shells) {
      shell.dataset.active = String(shell.dataset.slug === section);
    }
  }, [section]);

  return (
    <div className="corridor" ref={ref}>
      {children}
    </div>
  );
}
