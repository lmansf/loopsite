import type { ReactNode } from 'react';

/**
 * src/sections/pulse/Shell.tsx — server component.
 *
 * Appears in the RAW response body, so the room is readable, linkable and
 * navigable with zero JavaScript. See src/sections/_example/Shell.tsx for the
 * annotated reference.
 */
export function Shell({ children }: { children?: ReactNode }) {
  return (
    <section id="section-pulse" aria-labelledby="h-pulse">
      <h2 id="h-pulse" tabIndex={-1}>
        pulse
      </h2>
      <p className="hook">it has a pulse</p>
      <a className="next-link" href="/?s=tone">
        tone
      </a>
      {children}
    </section>
  );
}
