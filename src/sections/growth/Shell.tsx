import type { ReactNode } from 'react';

/**
 * src/sections/growth/Shell.tsx — server component.
 *
 * Appears in the RAW response body, so the room is readable, linkable and
 * navigable with zero JavaScript. See src/sections/_example/Shell.tsx for the
 * annotated reference.
 */
export function Shell({ children }: { children?: ReactNode }) {
  return (
    <section id="section-growth" aria-labelledby="h-growth">
      <h2 id="h-growth" tabIndex={-1}>
        growth
      </h2>
      <p className="hook">one more generation</p>
      <a className="next-link" href="/?s=orbit">
        orbit
      </a>
      {children}
    </section>
  );
}
