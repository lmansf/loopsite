'use client';

/**
 * src/lib/use-lazy-mount.ts — mount a heavy subtree only once it is near the
 * viewport. Spec: design/05-build-spec.md §F.4. FROZEN after WP0.
 */

import { useEffect, useRef, useState } from 'react';

export function useLazyMount(
  opts?: IntersectionObserverInit,
): [React.RefObject<HTMLElement | null>, boolean] {
  const ref = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      // No IO (very old browser, some test runners): mount on the next task
      // rather than synchronously, which would cascade a render.
      const id = setTimeout(() => setMounted(true), 0);
      return () => clearTimeout(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setMounted(true);
            io.disconnect();
            return;
          }
        }
      },
      { rootMargin: '200px', threshold: 0.01, ...opts },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mounted, opts]);

  return [ref, mounted];
}
