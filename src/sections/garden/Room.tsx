'use client';

/**
 * src/sections/garden/Room.tsx — the registry's entry for GARDEN.
 *
 * A thin client shim: the room itself is `Field.tsx`, reached only through
 * the dynamic import below. Every registry-reachable `Room.tsx` is a client
 * reference of the page and is bundled into the route's own chunk; a module
 * reached only by a dynamic import from client code gets a chunk of its own.
 * This keeps the room's 13 KB out of the landing route until it is visited.
 */

import { lazy, Suspense } from 'react';
import type { SectionProps } from '@/lib/types';

const Field = lazy(() => import('./Field'));

export default function Room(props: SectionProps) {
  return (
    <Suspense fallback={null}>
      <Field {...props} />
    </Suspense>
  );
}
