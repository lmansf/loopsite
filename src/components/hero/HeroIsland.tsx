'use client';

/**
 * src/components/hero/HeroIsland.tsx — React adopting the inline bootstrap.
 *
 * Spec: design/05-build-spec.md §B, §F.4, doc 03 §2.4. **OWNED BY WP1.**
 *
 * The bootstrap made the hero reactive before hydration. This island takes
 * over: it flushes `window.__loop.q` into the real beacon (so a
 * `hero_interacted` at 300 ms is never lost) and calls every function in
 * `window.__loop.off` to detach the bootstrap's listeners. There is no double
 * binding and no visual discontinuity, because both implementations drive the
 * same two custom properties (`--px`/`--py`, the pointer comet's position).
 *
 * The hero copy sequence itself (`again` → `now it's yours` → `there are twelve
 * of these`) is driven by the shell's frame hook from `runtime.fired` and the
 * node count; `tap the ring` dies on first touch through `engageHero`, which
 * the ring calls on real input and this island calls the moment the ring holds
 * a node for any reason (a shared link populates it before the visitor acts).
 */

import { useEffect } from 'react';
import { beacon } from '@/lib/beacon';
import { useLoop } from '../shell/LoopContext';
import { engageHero } from './engage';

export function HeroIsland() {
  const { nodeCount } = useLoop();

  useEffect(() => {
    if (nodeCount > 0) engageHero();
  }, [nodeCount]);

  useEffect(() => {
    const boot = window.__loop;
    if (boot) {
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
    }

    // From here the island owns the two custom properties the bootstrap drove.
    const html = document.documentElement;
    let px = 0.5;
    let py = 0.5;
    let frame = 0;
    const paint = () => {
      frame = 0;
      html.style.setProperty('--px', String(px));
      html.style.setProperty('--py', String(py));
    };
    const move = (e: PointerEvent) => {
      if (html.dataset.motion === 'reduce') return;
      px = e.clientX / window.innerWidth;
      py = e.clientY / window.innerHeight;
      if (!frame) frame = requestAnimationFrame(paint);
      if (!html.hasAttribute('data-loop-pointer')) html.setAttribute('data-loop-pointer', '');
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
