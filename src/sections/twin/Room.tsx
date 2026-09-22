'use client';

/**
 * src/sections/twin/Room.tsx — THE TWIN (§C.13, §D.13).
 *
 * Trigger: your loop matches a GARDEN loop under rotation — same node count
 * n >= 3, one offset δ under which every angle is within ±1/64 rev of a garden
 * node's angle + δ, each matched radius level within ±1 (twin/logic.ts).
 * Effect: both rings light to --c-accent-hi and phase-lock for 8 s, then
 * release. No copy.
 *
 * GARDEN publishes its field on the bus while it is mounted and paints the
 * lock on both rings; this detector only decides. A loop taken from the field
 * onto the main ring is never its own twin.
 */

import { useEffect, useRef } from 'react';
import { getFrame } from '@/lib/clock';
import { getNodes, subscribeNodes } from '@/lib/ring-store';
import { markFound } from '@/lib/storage';
import { claim, release, type HiddenProps } from '../garden/stage';
import { getAdopted, getField, getLock, setLock, subscribeField } from './bus';
import { findTwin, LOCK_MS, signature } from './logic';

export default function Room(props: HiddenProps) {
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });
  const markRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!claim('twin')) return;
    const mark = markRef.current;
    let lastSig = '';
    let timer: ReturnType<typeof setTimeout> | null = null;

    function reflect(on: boolean): void {
      if (mark) mark.dataset.on = String(on);
    }

    function check(): void {
      const field = getField();
      if (field.length === 0) return;
      const t = getFrame().t;
      const lock = getLock();
      if (lock && t < lock.until) return;
      const nodes = getNodes();
      const sig = signature(nodes);
      if (sig === lastSig) return;
      lastSig = sig;
      const index = findTwin(nodes, field, getAdopted());
      if (index < 0) return;
      setLock({ index, until: t + LOCK_MS });
      markFound('twin');
      const p = propsRef.current;
      p.onExplore({ name: 'collectible_found', section: p.id });
      reflect(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => reflect(false), LOCK_MS);
    }

    const unsubNodes = subscribeNodes(check);
    const unsubField = subscribeField(check);
    check();

    return () => {
      unsubNodes();
      unsubField();
      if (timer) clearTimeout(timer);
      release('twin');
    };
  }, []);

  return <span ref={markRef} data-hidden="twin" data-on="false" hidden />;
}
