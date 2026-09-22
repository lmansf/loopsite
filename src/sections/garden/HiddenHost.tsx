'use client';

/**
 * src/sections/garden/HiddenHost.tsx — where the hidden destinations run.
 *
 * Spec: design/05-build-spec.md §C.13, §D.13, §J.10. The five hidden
 * destinations are registry entries with `notch: null`: they are modes and
 * overlays over whichever room is showing, never corridor rooms, so nothing
 * in the corridor mounts them. This host does. It is carried by GARDEN's
 * shell — which is in the document from the first byte, whichever room is
 * showing — and once the page has settled it mounts the five registry
 * entries into the stage. Each entry is a shim that lazy-loads its trigger,
 * so the landing route carries only the shims.
 *
 * It also mirrors the ring's share code on its root as `data-loop`, with the
 * reverse and slow flags: the one place the current direction, period and node
 * set can be read back without a canvas.
 */

import { useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LoopContext } from '@/components/shell/LoopContext';
import { getFrame, subscribeFrame, SWEEP_MS } from '@/lib/clock';
import { getNodes, subscribeNodes } from '@/lib/ring-store';
import { encodeLoop } from '@/lib/share';
import { asSectionId } from '@/lib/types';
import Room144 from '../144/Room';
import Reverse from '../reverse/Room';
import Silence from '../silence/Room';
import Slow from '../slow/Room';
import Twin from '../twin/Room';
import type { HiddenProps } from './stage';
import styles from './room.module.css';

/** the hero must be reactive first; the hidden layer can wait a beat */
const MOUNT_DELAY_MS = 1200;
/** how often the share-code mirror is refreshed, in clock ms */
const MIRROR_MS = 250;

const HIDDEN = [
  ['silence', Silence],
  ['reverse', Reverse],
  ['slow', Slow],
  ['144', Room144],
  ['twin', Twin],
] as const;

export function HiddenHost() {
  const loop = useContext(LoopContext);
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setRoot(document.getElementById('stage')), MOUNT_DELAY_MS);
    return () => clearTimeout(id);
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
      {HIDDEN.map(([id, Room]) => {
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
    </div>,
    root,
  );
}
