import type { ReactNode } from 'react';

/**
 * src/sections/swarm/Shell.tsx — server component.
 *
 * Appears in the RAW response body, so the room is readable, linkable and
 * navigable with zero JavaScript. See src/sections/_example/Shell.tsx for the
 * annotated reference.
 */
export function Shell({ children }: { children?: ReactNode }) {
  return (
    <section id="section-swarm" aria-labelledby="h-swarm">
      <h2 id="h-swarm" tabIndex={-1}>
        swarm
      </h2>
      <p className="hook">they follow it</p>
      <a className="next-link" href="/?s=mirror">
        mirror
      </a>
      {children}
    </section>
  );
}
