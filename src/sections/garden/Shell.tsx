import type { ReactNode } from 'react';
import { HiddenHost } from './HiddenHost';

/**
 * src/sections/garden/Shell.tsx — server component.
 *
 * Appears in the RAW response body, so the room is readable, linkable and
 * navigable with zero JavaScript. The only copy is the hook line (§D.11).
 *
 * It also carries the hidden destinations' host (a client component that
 * renders nothing on the server): this shell is in the document from the
 * first byte whichever room is showing, which is exactly what the five
 * global triggers need.
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
      <HiddenHost />
      {children}
    </section>
  );
}
