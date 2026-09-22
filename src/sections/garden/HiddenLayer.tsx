'use client';

/**
 * src/sections/garden/HiddenLayer.tsx — the five hidden destinations, mounted.
 *
 * One lazy chunk, reached only from HiddenHost. The Rooms are imported here
 * statically on purpose: the registry's own `load()` closures are the other
 * way to reach them (RoomLayer, at /?s=<hidden>), and a module with two lazy
 * parents is one the bundler hoists into the landing route. This way the
 * landing route never carries a byte of them.
 */

import type { LoopContextValue } from '@/components/shell/LoopContext';
import { asSectionId } from '@/lib/types';
import Room144 from '../144/Room';
import Reverse from '../reverse/Room';
import Silence from '../silence/Room';
import Slow from '../slow/Room';
import Twin from '../twin/Room';
import type { HiddenProps } from './stage';

const ROOMS = [
  ['silence', Silence],
  ['reverse', Reverse],
  ['slow', Slow],
  ['144', Room144],
  ['twin', Twin],
] as const;

export function HiddenLayer({ loop }: { loop: LoopContextValue }) {
  const rt = loop.runtime;
  return (
    <>
      {ROOMS.map(([id, Room]) => {
        const props: HiddenProps = {
          id: asSectionId(id),
          active: false,
          visible: true,
          reducedMotion: loop.reducedMotion,
          seed: loop.seed,
          onExplore: loop.onExplore,
          clock: rt.frame,
          nodes: rt.nodes,
          geometry: rt.geometry,
          fired: rt.fired,
          ctx: rt.ctx,
          bg: rt.bg,
          tier: loop.tier,
          say: loop.say,
          runtime: rt,
        };
        return <Room key={id} {...props} />;
      })}
    </>
  );
}
