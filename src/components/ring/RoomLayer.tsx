'use client';

/**
 * src/components/ring/RoomLayer.tsx — lazy mounting for the active room.
 *
 * Spec: design/05-build-spec.md §F.3, §F.6.
 *
 * Only the active room's chunk is ever fetched, and it is fetched once. The
 * `SectionProps` object handed to the room is deliberately cheap to keep
 * current: `clock` and `fired` are stable object identities that the ring's
 * frame driver mutates in place, so React re-renders the room only when
 * something structural changes (nodes, geometry, contexts, tier, motion).
 */

import { useEffect, useState, type ComponentType } from 'react';
import type { SectionModule, SectionProps } from '@/lib/types';
import { useLoop } from '../shell/LoopContext';

/** Module-level, so a room is fetched once per session however often it is visited. */
const loaded = new Map<string, ComponentType<SectionProps>>();

export function RoomLayer({ module: mod }: { module: SectionModule }) {
  const loop = useLoop();
  const [, bump] = useState(0);

  useEffect(() => {
    if (loaded.has(mod.id)) return;
    let alive = true;
    mod
      .load()
      .then((m) => {
        loaded.set(mod.id, m.default);
        if (alive) bump((v) => v + 1);
      })
      .catch((err: unknown) => {
        console.error('[loop] room failed to load', mod.id, err);
      });
    return () => {
      alive = false;
    };
  }, [mod]);

  const Room = loaded.get(mod.id);
  if (!Room) return null;

  const { runtime } = loop;
  const props: SectionProps = {
    id: mod.id,
    active: true,
    visible: true,
    reducedMotion: loop.reducedMotion,
    seed: loop.seed,
    onExplore: loop.onExplore,
    clock: runtime.frame,
    nodes: runtime.nodes,
    geometry: runtime.geometry,
    fired: runtime.fired,
    ctx: runtime.ctx,
    bg: runtime.bg,
    tier: loop.tier,
    say: loop.say,
  };

  return <Room {...props} />;
}
