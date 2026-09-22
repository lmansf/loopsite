import type { ReactNode } from 'react';

/**
 * src/sections/silence/Shell.tsx — server component.
 *
 * Appears in the RAW response body, so the room is readable, linkable and
 * navigable with zero JavaScript. See src/sections/_example/Shell.tsx for the
 * annotated reference.
 */
export function Shell({ children }: { children?: ReactNode }) {
  return (
    <section id="section-silence" aria-labelledby="h-silence">
      <h2 id="h-silence" tabIndex={-1}>
        silence
      </h2>
      {children}
    </section>
  );
}
