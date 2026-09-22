import type { ReactNode } from 'react';

/**
 * src/sections/slow/Shell.tsx — server component.
 *
 * Appears in the RAW response body, so the room is readable, linkable and
 * navigable with zero JavaScript. See src/sections/_example/Shell.tsx for the
 * annotated reference.
 */
export function Shell({ children }: { children?: ReactNode }) {
  return (
    <section id="section-slow" aria-labelledby="h-slow">
      <h2 id="h-slow" tabIndex={-1}>
        slow
      </h2>
      {children}
    </section>
  );
}
