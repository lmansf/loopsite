import type { ReactNode } from 'react';

/**
 * src/sections/garden/Shell.tsx — server component.
 *
 * Appears in the RAW response body, so the room is readable, linkable and
 * navigable with zero JavaScript. See src/sections/_example/Shell.tsx for the
 * annotated reference.
 */
export function Shell({ children }: { children?: ReactNode }) {
  return (
    <section id="section-garden" aria-labelledby="h-garden">
      <h2 id="h-garden" tabIndex={-1}>
        garden
      </h2>
      <p className="hook">loops left here</p>
      <a className="next-link" href="/?s=return">
        return
      </a>
      {children}
    </section>
  );
}
