/**
 * src/lib/motion.ts — the sanctioned animation helper.
 *
 * Spec: design/05-build-spec.md §F.4. FROZEN after WP0.
 *
 * `motion/mini` only (+3.5 KB gz). `motion/react` is banned (+38.5 KB gz).
 * Under reduced motion the animation jumps straight to its end state, so no
 * caller ever has to branch.
 */

import { animate } from 'motion/mini';

function reduced(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dataset.motion === 'reduce';
}

export function animateEl(
  el: Element,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  options: KeyframeAnimationOptions,
): Promise<void> {
  if (reduced()) {
    // Jump to the end: apply the final frame and resolve.
    try {
      const anim = (el as HTMLElement).animate(keyframes, { ...options, duration: 0, fill: 'forwards' });
      anim.finish();
    } catch {
      /* element detached — nothing to animate */
    }
    return Promise.resolve();
  }
  try {
    const controls = animate(
      el as HTMLElement,
      keyframes as Parameters<typeof animate>[1],
      options as Parameters<typeof animate>[2],
    );
    return Promise.resolve(controls.finished as unknown as Promise<unknown>).then(() => undefined);
  } catch {
    return Promise.resolve();
  }
}
