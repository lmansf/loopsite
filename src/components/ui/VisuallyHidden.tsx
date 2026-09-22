import type { ReactNode } from 'react';

/** Present in the accessibility tree, absent from the page. */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="u-sr">{children}</span>;
}
