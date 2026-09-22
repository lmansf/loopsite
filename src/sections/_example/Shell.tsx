import type { ReactNode } from 'react';

/**
 * The SERVER half of a room. No 'use client', no hooks, no browser globals.
 *
 * Requirements every room's Shell must meet (§D, §F.6):
 *   - a <section id="section-<slug>"> with aria-labelledby
 *   - exactly one <h2>, carrying the one-word label from §I.2, tabIndex={-1}
 *     so deliberate navigation can move focus to it
 *   - the hook line from §I.3
 *   - a real <a> to the next room, labelled with that room's NAME — never
 *     "read more" / "learn more" / "next" (rubric E1 is a hard zero otherwise)
 *   - no copy that is not in §I. Adding a word means editing §I first.
 *
 * The corridor wrapper supplies `min-height: 100dvh` and the cross-fade, so the
 * Shell itself needs no layout.
 */
export function Shell({ children }: { children?: ReactNode }) {
  return (
    <section id="section-_example" aria-labelledby="h-_example">
      <h2 id="h-_example" tabIndex={-1}>
        example
      </h2>
      <p className="hook">tap the ring</p>
      <a className="next-link" href="/?s=origin">
        origin
      </a>
      {children}
    </section>
  );
}
