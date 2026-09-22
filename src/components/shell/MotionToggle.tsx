'use client';

/**
 * The in-page motion control. Copy: `gentle mode` (§I.4). Flips
 * html[data-motion] and takes effect without a reload (§H.1).
 */

import { Toggle } from '../ui/Toggle';
import { useMotionToggle } from '@/lib/use-motion-preference';

export function MotionToggle() {
  const [value, toggle] = useMotionToggle();
  return (
    <Toggle pressed={value === 'reduce'} onClick={toggle} data-control="motion">
      gentle mode
    </Toggle>
  );
}
