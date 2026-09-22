import type { ReactNode } from 'react';

/**
 * src/sections/return/Shell.tsx — server component.
 *
 * Appears in the RAW response body, so the room is readable, linkable and
 * navigable with zero JavaScript. See src/sections/_example/Shell.tsx for the
 * annotated reference.
 */
export function Shell({ children }: { children?: ReactNode }) {
  return (
    <section id="section-return" aria-labelledby="h-return">
      <h2 id="h-return" tabIndex={-1}>
        return
      </h2>
      <a className="next-link" href="/?s=origin">
        origin
      </a>
      {children}
    </section>
  );
}
