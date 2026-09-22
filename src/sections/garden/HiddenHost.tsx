'use client';

/**
 * src/sections/garden/HiddenHost.tsx — where the hidden destinations run.
 *
 * Spec: design/05-build-spec.md §C.13, §D.13, §J.10. The five hidden
 * destinations are registry entries with `notch: null`: they are modes and
 * overlays over whichever room is showing, never corridor rooms, so nothing
 * in the corridor mounts them. This host does. It is carried by GARDEN's
 * shell — which is in the document from the first byte, whichever room is
 * showing — and it mounts each hidden Room from its own lazy chunk once the
 * page has settled, so the landing route pays nothing for them.
 *
 * It also mirrors the ring's share code on its root as `data-loop`, with the
 * reverse and slow flags: the one place the current direction, period and node
 * set can be read back without a canvas.
 */

import { useContext, useEffect, useRef, useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { LoopContext } from '@/components/shell/LoopContext';
import { getFrame, subscribeFrame, SWEEP_MS } from '@/lib/clock';
import { getNodes, subscribeNodes } from '@/lib/ring-store';
import { encodeLoop } from '@/lib/share';
import { asSectionId } from '@/lib/types';
import type { HiddenProps } from './stage';
import styles from './room.module.css';

/** the hero must be reactive first; the hidden layer can wait a beat */
const MOUNT_DELAY_MS = 1200;
/** how often the share-code mirror is refreshed, in clock ms */
const MIRROR_MS = 250;

type HiddenRoom = ComponentType<HiddenProps>;

const HIDDEN: ReadonlyArray<{ id: string; load: () => Promise<{ default: HiddenRoom }> }> = [
  { id: 'silence', load: () => import('../silence/Room') },
  { id: 'reverse', load: () => import('../reverse/Room') },
  { id: 'slow', load: () => import('../slow/Room') },
  { id: '144', load: () => import('../144/Room') },
  { id: 'twin', load: () => import('../twin/Room') },
];

export function HiddenHost() {
  const loop = useContext(LoopContext);
  const [rooms, setRooms] = useState<HiddenRoom[]>([]);
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    const id = setTimeout(() => {
      const stage = document.getElementById('stage');
      if (!stage) return;
      Promise.all(HIDDEN.map((h) => h.load()))
        .then((mods) => {
          if (!alive) return;
          setRoot(stage);
          setRooms(mods.map((m) => m.default));
        })
        .catch(() => {
          /* a hidden destination that cannot load is simply not found today */
        });
    }, MOUNT_DELAY_MS);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let last = '';
    function sync(): void {
      const f = getFrame();
      const code = encodeLoop(getNodes(), { reverse: f.dir === -1, slow: f.periodMs > SWEEP_MS });
      if (code === last) return;
      last = code;
      el!.dataset.loop = code;
    }
    let acc = MIRROR_MS;
    const unsubNodes = subscribeNodes(sync);
    const unsubFrame = subscribeFrame((f) => {
      acc += f.dt;
      if (acc < MIRROR_MS) return;
      acc = 0;
      sync();
    });
    return () => {
      unsubNodes();
      unsubFrame();
    };
  }, [root]);

  if (!loop || !root) return null;
  const rt = loop.runtime;

  return createPortal(
    <div ref={hostRef} className={styles.hidden} data-hidden-root="" aria-hidden="true">
      {rooms.map((Room, i) => {
        const entry = HIDDEN[i];
        if (!entry) return null;
        const props: HiddenProps = {
          id: asSectionId(entry.id),
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
        return <Room key={entry.id} {...props} />;
      })}
    </div>,
    root,
  );
}
