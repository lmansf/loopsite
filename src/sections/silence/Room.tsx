'use client';

/**
 * src/sections/silence/Room.tsx — the registry's entry for SILENCE.
 *
 * A thin client shim: the trigger itself is `Trigger.tsx`, reached only
 * through the dynamic import below so it ships as a chunk of its own (see
 * src/sections/garden/Room.tsx). The hidden host mounts this same shim over
 * whichever room is showing.
 */

import { lazy, Suspense } from 'react';
import type { HiddenProps } from '../garden/stage';

const Trigger = lazy(() => import('./Trigger'));

export default function Room(props: HiddenProps) {
  return (
    <Suspense fallback={null}>
      <Trigger {...props} />
    </Suspense>
  );
}
