import type { ReactNode } from 'react';

/**
 * src/sections/loom/Shell.tsx — server component.
 *
 * Appears in the RAW response body, so the room is readable, linkable and
 * navigable with zero JavaScript. See src/sections/_example/Shell.tsx for the
 * annotated reference.
 */
export function Shell({ children }: { children?: ReactNode }) {
  return (
    <section id="section-loom" aria-labelledby="h-loom">
      <h2 id="h-loom" tabIndex={-1}>
        loom
      </h2>
      <p className="hook">four thousand years</p>
      <a className="next-link" href="/?s=wear">
        wear
      </a>
      {children}
    </section>
  );
}
