import type { ReactNode } from 'react';

/**
 * src/sections/trail/Shell.tsx — server component.
 *
 * Appears in the RAW response body, so the room is readable, linkable and
 * navigable with zero JavaScript. See src/sections/_example/Shell.tsx for the
 * annotated reference.
 */
export function Shell({ children }: { children?: ReactNode }) {
  return (
    <section id="section-trail" aria-labelledby="h-trail">
      <h2 id="h-trail" tabIndex={-1}>
        trail
      </h2>
      <p className="hook">it draws</p>
      <a className="next-link" href="/?s=swarm">
        swarm
      </a>
      {children}
    </section>
  );
}
