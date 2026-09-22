import type { ReactNode } from 'react';

/**
 * src/sections/144/Shell.tsx — server component.
 *
 * Appears in the RAW response body, so the room is readable, linkable and
 * navigable with zero JavaScript. See src/sections/_example/Shell.tsx for the
 * annotated reference.
 */
export function Shell({ children }: { children?: ReactNode }) {
  return (
    <section id="section-144" aria-labelledby="h-144">
      <h2 id="h-144" tabIndex={-1}>
        144
      </h2>
      {children}
    </section>
  );
}
