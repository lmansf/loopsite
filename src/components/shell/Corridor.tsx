'use client';

/**
 * src/components/shell/Corridor.tsx — the twelve server-rendered room shells.
 *
 * Spec: design/05-build-spec.md §C.11, §F.6, §I.3. **WP3.**
 *
 * Without JS this is a plain, readable, scrollable document: all twelve shells
 * in order, each with its <h2>, its hook line and a link to the next. With JS
 * (html[data-loop-js], set before first paint) it collapses to 100dvh with
 * only the active shell visible — no reflow, CLS 0.
 *
 * The hook line is shown once on entry for 3 s and dismissed by any input
 * (§I.3): `data-hook` flips from `shown` to `done`, and the CSS fades it.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';

const HOOK_MS = 3000;

export function Corridor({ section, children }: { section: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  /** the section whose hook line has been dismissed; compared against `section` */
  const [doneFor, setDoneFor] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const shells = el.querySelectorAll<HTMLElement>('.room-shell');
    for (const shell of shells) {
      shell.dataset.active = String(shell.dataset.slug === section);
    }
  }, [section]);

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setDoneFor(section);
    };
    const timer = setTimeout(finish, HOOK_MS);
    const opts: AddEventListenerOptions = { passive: true, capture: true };
    document.addEventListener('pointerdown', finish, opts);
    document.addEventListener('keydown', finish, opts);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', finish, opts);
      document.removeEventListener('keydown', finish, opts);
    };
  }, [section]);

  return (
    <div className="corridor" ref={ref} data-hook={doneFor === section ? 'done' : 'shown'}>
      {children}
    </div>
  );
}
