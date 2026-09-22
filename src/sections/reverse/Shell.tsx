import type { ReactNode } from 'react';

/**
 * src/sections/reverse/Shell.tsx — server component.
 *
 * Appears in the RAW response body, so the room is readable, linkable and
 * navigable with zero JavaScript. See src/sections/_example/Shell.tsx for the
 * annotated reference.
 */
export function Shell({ children }: { children?: ReactNode }) {
  return (
    <section id="section-reverse" aria-labelledby="h-reverse">
      <h2 id="h-reverse" tabIndex={-1}>
        reverse
      </h2>
      {children}
    </section>
  );
}
