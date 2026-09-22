import type { ReactNode } from 'react';

/**
 * src/sections/wear/Shell.tsx — server component.
 *
 * Appears in the RAW response body, so the room is readable, linkable and
 * navigable with zero JavaScript. See src/sections/_example/Shell.tsx for the
 * annotated reference.
 */
export function Shell({ children }: { children?: ReactNode }) {
  return (
    <section id="section-wear" aria-labelledby="h-wear">
      <h2 id="h-wear" tabIndex={-1}>
        wear
      </h2>
      <p className="hook">it&apos;s getting tired</p>
      <a className="next-link" href="/?s=garden">
        garden
      </a>
      {children}
    </section>
  );
}
