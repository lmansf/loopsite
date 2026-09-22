import type { ReactNode } from 'react';

/**
 * src/sections/mirror/Shell.tsx — server component.
 *
 * Appears in the RAW response body, so the room is readable, linkable and
 * navigable with zero JavaScript. See src/sections/_example/Shell.tsx for the
 * annotated reference.
 */
export function Shell({ children }: { children?: ReactNode }) {
  return (
    <section id="section-mirror" aria-labelledby="h-mirror">
      <h2 id="h-mirror" tabIndex={-1}>
        mirror
      </h2>
      <p className="hook">it sees itself</p>
      <a className="next-link" href="/?s=growth">
        growth
      </a>
      {children}
    </section>
  );
}
