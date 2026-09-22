"use client";

/**
 * src/sections/slow/Room.tsx — client component, lazily loaded.
 *
 * PLACEHOLDER written by WP0 so the site is navigable end to end before this
 * room exists. Its owner replaces this file wholesale: delete the
 * PlaceholderRoom import and draw the room from `props`. Copy
 * src/sections/_example/Room.tsx as the starting point.
 */

import { PlaceholderRoom } from '@/components/ring/PlaceholderRoom';
import type { SectionProps } from '@/lib/types';

export default function Room(props: SectionProps) {
  return <PlaceholderRoom {...props} label="slow" />;
}
