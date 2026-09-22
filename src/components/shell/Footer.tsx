import { MotionToggle } from './MotionToggle';
import { KeepButton } from '@/components/ui/KeepButton';
import { ShareButton } from '@/components/ui/ShareButton';

/**
 * The footer frame is a server component; its three controls are clients
 * (§D.3). Copy is fixed by §C.13 and is the whole of it:
 *
 *   gentle mode · keep this · send the night as you have it
 *
 * No sign-up, no email field, no account, ever.
 */
export function Footer() {
  return (
    <footer className="loop-footer">
      <MotionToggle />
      <KeepButton />
      <ShareButton />
    </footer>
  );
}
