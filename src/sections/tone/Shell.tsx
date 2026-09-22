import type { ReactNode } from 'react';

/**
 * src/sections/tone/Shell.tsx — server component.
 *
 * Appears in the RAW response body, so the room is readable, linkable and
 * navigable with zero JavaScript. See src/sections/_example/Shell.tsx for the
 * annotated reference.
 */
export function Shell({ children }: { children?: ReactNode }) {
  return (
    <section id="section-tone" aria-labelledby="h-tone">
      <h2 id="h-tone" tabIndex={-1}>
        tone
      </h2>
      <p className="hook">radius is pitch</p>
      <a className="next-link" href="/?s=trail">
        trail
      </a>
      {children}
    </section>
  );
}
