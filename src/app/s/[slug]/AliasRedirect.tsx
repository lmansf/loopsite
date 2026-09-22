'use client';

import { useEffect } from 'react';

/** Replaces /s/<slug> with the canonical /?s=<slug> on arrival (§C.10). */
export function AliasRedirect({ slug }: { slug: string }) {
  useEffect(() => {
    window.location.replace(`/?s=${slug}`);
  }, [slug]);
  return null;
}
