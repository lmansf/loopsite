import { MotionToggle } from './MotionToggle';
import { KeepButton } from '@/components/ui/KeepButton';
import { ShareButton } from '@/components/ui/ShareButton';
import { Ambient } from '@/figures/Ambient';

/**
 * The footer frame is a server component; its three controls are clients
 * (§D.3). Copy is fixed by §C.13 and is the whole of it:
 *
 *   gentle mode · keep this · send the night as you have it
 *
 * No sign-up, no email field, no account, ever.
 *
 * ## Why `<Ambient>` is mounted here
 *
 * §D.3 draws the ambient canvas inside `<main>` and has the runtime mount it.
 * Neither is available to WP-C: `src/app/page.tsx` is WP-A's and
 * `src/components/night/Runtime.tsx` is WP-B's, and the ownership rule is one
 * agent per file. The shell is WP-C's, it renders exactly once per document,
 * and the canvas is `position: fixed` and `aria-hidden` — so where it sits in
 * the tree changes nothing about what it paints, what it costs or what a
 * screen reader hears. It is first in the footer rather than last so that the
 * three controls stay adjacent in the tab order.
 */
export function Footer() {
  return (
    <footer className="loop-footer">
      <Ambient />
      <MotionToggle />
      <KeepButton />
      <ShareButton />
    </footer>
  );
}
