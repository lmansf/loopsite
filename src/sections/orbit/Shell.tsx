import type { ReactNode } from 'react';

/**
 * src/sections/orbit/Shell.tsx — server component.
 *
 * Appears in the RAW response body, so the room is readable, linkable and
 * navigable with zero JavaScript. See src/sections/_example/Shell.tsx for the
 * annotated reference.
 */
export function Shell({ children }: { children?: ReactNode }) {
  return (
    <section id="section-orbit" aria-labelledby="h-orbit">
      <h2 id="h-orbit" tabIndex={-1}>
        orbit
      </h2>
      <p className="hook">circles on circles</p>
      <a className="next-link" href="/?s=loom">
        loom
      </a>
      {children}
    </section>
  );
}
