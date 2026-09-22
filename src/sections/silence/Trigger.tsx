
/**
 * src/sections/silence/Trigger.tsx — SILENCE (§C.13, §D.13).
 *
 * Trigger: the ring holds 0 nodes for one continuous full revolution, in a
 * session in which it has held at least one. Everything on the stage fades to
 * a single hairline circle over 900 ms; the circle breathes; one word appears.
 * Any tap or Space restores the exact previous node set within 240 ms.
 *
 * Two ways to reach 0 nodes, one restore rule:
 *   - Esc lifts the ring into the shell's held state (§J.9). The shell restores
 *     it on the next tap or Space, so this room only shows and hides the veil.
 *   - Removing every node one by one leaves nothing held. This room keeps the
 *     last non-empty set and restores it itself, claiming that first tap so it
 *     restores instead of placing.
 */

import { useEffect, useRef } from 'react';
import { getFrame, subscribeFrame } from '@/lib/clock';
import { getNodes, restoreNodes, subscribeNodes } from '@/lib/ring-store';
import { markFound } from '@/lib/storage';
import type { RingNode } from '@/lib/types';
import { claim, inStage, release, type HiddenProps } from '../garden/stage';
import styles from './room.module.css';

export default function Room(props: HiddenProps) {
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });
  const veilRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!claim('silence')) return;
    const veil = veilRef.current;

    let hadNodes = getNodes().length > 0;
    let lastFull: readonly RingNode[] = getNodes();
    /** clock.t when the ring last became empty, or -1 */
    let emptySince = -1;
    /** the shell lifted the ring with Esc and will restore it itself */
    let held = false;
    let escArmed = false;
    let shown = false;

    function show(): void {
      shown = true;
      if (veil) veil.dataset.on = 'true';
      markFound('silence');
      const p = propsRef.current;
      p.onExplore({ name: 'collectible_found', section: p.id });
      p.say('oh.');
    }

    function hide(): void {
      shown = false;
      if (veil) veil.dataset.on = 'false';
      propsRef.current.say('');
    }

    const unsubNodes = subscribeNodes((n) => {
      if (n.length > 0) {
        hadNodes = true;
        lastFull = n;
        emptySince = -1;
        escArmed = false;
        held = false;
        if (shown) hide();
      } else {
        emptySince = getFrame().t;
        held = escArmed;
        escArmed = false;
      }
    });

    const unsubFrame = subscribeFrame((f) => {
      if (shown || !hadNodes || emptySince < 0) return;
      if (getNodes().length !== 0) return;
      if (f.t - emptySince >= f.periodMs) show();
    });

    /** The first tap or Space after the veil restores; it never places. */
    function restore(e: Event): void {
      if (!shown || held) return;
      if (getNodes().length > 0) return;
      restoreNodes(lastFull);
      e.stopPropagation();
      e.preventDefault();
    }

    function onPointerDown(e: PointerEvent): void {
      if (!inStage(e.target)) return;
      restore(e);
    }

    function onKeyDown(e: KeyboardEvent): void {
      if (!inStage(e.target)) return;
      if (e.key === 'Escape') {
        if (getNodes().length > 0) escArmed = true;
        return;
      }
      if (e.key === ' ' || e.code === 'Space') restore(e);
    }

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown, true);

    return () => {
      unsubNodes();
      unsubFrame();
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
      if (shown) hide();
      release('silence');
    };
  }, []);

  return (
    <div ref={veilRef} className={styles.veil} data-hidden="silence" data-on="false">
      <div className={`${styles.circle} is-ambient`} />
      <span className={styles.word}>oh.</span>
    </div>
  );
}
