'use client';

/**
 * src/components/hero/HeroIsland.tsx — React adopting the inline bootstrap.
 *
 * Spec: design/05-build-spec.md §F.4, doc 03 §2.4. **OWNED BY WP1.**
 *
 * The bootstrap made the hero reactive before hydration. This island takes
 * over: it flushes `window.__loop.q` into the real beacon (so a
 * `hero_interacted` at 300 ms is never lost) and calls every function in
 * `window.__loop.off` to detach the bootstrap's listeners. There is no double
 * binding and no visual discontinuity, because both implementations drive the
 * same two custom properties.
 */

import { useEffect } from 'react';
import { beacon } from '@/lib/beacon';

export function HeroIsland() {
  useEffect(() => {
    const boot = window.__loop;
    if (!boot) return;
    for (const ev of boot.q) {
      if (ev?.n === 'hero_interacted') beacon('hero_interacted');
    }
    boot.q = [];
    for (const off of boot.off) {
      try {
        off();
      } catch {
        /* already detached */
      }
    }
    boot.off = [];

    // From here the island owns the two custom properties the bootstrap drove.
    let px = 0.5;
    let py = 0.5;
    let frame = 0;
    const paint = () => {
      frame = 0;
      const s = document.documentElement.style;
      s.setProperty('--px', String(px));
      s.setProperty('--py', String(py));
    };
    const move = (e: PointerEvent) => {
      if (document.documentElement.dataset.motion === 'reduce') return;
      px = e.clientX / window.innerWidth;
      py = e.clientY / window.innerHeight;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const first = () => beacon('hero_interacted');

    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerdown', first, { passive: true });
    document.addEventListener('keydown', first, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerdown', first);
      document.removeEventListener('keydown', first);
    };
  }, []);

  return null;
}
