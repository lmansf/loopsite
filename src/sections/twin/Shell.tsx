import type { ReactNode } from 'react';

/**
 * src/sections/twin/Shell.tsx — server component.
 *
 * Appears in the RAW response body, so the room is readable, linkable and
 * navigable with zero JavaScript. See src/sections/_example/Shell.tsx for the
 * annotated reference.
 */
export function Shell({ children }: { children?: ReactNode }) {
  return (
    <section id="section-twin" aria-labelledby="h-twin">
      <h2 id="h-twin" tabIndex={-1}>
        twin
      </h2>
      {children}
    </section>
  );
}
