'use client';

import { useEffect } from 'react';

/**
 * Replaces `/s/<slug>` with the canonical `/?s=<slug>` on arrival (§C.11).
 * A passive change, so it replaces and never pushes: Back leaves in one press.
 */
export function AliasRedirect({ slug }: { slug: string }) {
  useEffect(() => {
    window.location.replace(`/?s=${slug}`);
  }, [slug]);
  return null;
}
