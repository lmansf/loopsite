import type { ReactNode } from 'react';

/**
 * src/sections/origin/Shell.tsx — server component.
 *
 * Appears in the RAW response body, so the room is readable, linkable and
 * navigable with zero JavaScript. See src/sections/_example/Shell.tsx for the
 * annotated reference.
 */
export function Shell({ children }: { children?: ReactNode }) {
  return (
    <section id="section-origin" aria-labelledby="h-origin">
      <h2 id="h-origin" tabIndex={-1}>
        origin
      </h2>
      <p className="hook">tap the ring</p>
      <a className="next-link" href="/?s=pulse">
        pulse
      </a>
      {children}
    </section>
  );
}
