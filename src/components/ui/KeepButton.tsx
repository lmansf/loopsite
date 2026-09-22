'use client';

/**
 * `keep this` — the ring, as a PNG. Spec §C.6. **WP3.**
 *
 * Three triggers, one action: the button in the footer, `K` while the stage
 * has focus (AppShell clicks this button), and a long-press of ≥600 ms
 * anywhere inside the stage that is not on a node. The press-and-hold inside
 * 0.25 R of the centre belongs to SLOW (§C.13) and is left alone.
 *
 * The composite, the frame, the `loop` signature and the download live in
 * `@/lib/keep`. The confirmation is the canvas rim brightening for 240 ms —
 * `html[data-kept]`, styled in shell.css. On success the stage receives a
 * `loop:kept` CustomEvent carrying the press point (if any), which TRAIL
 * uses to show `keep this` beside the finger for 2 s (§D.4).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { keepPng } from '@/lib/keep';
import { encodeLoop } from '@/lib/share';
import { getFrame } from '@/lib/clock';
import { getNodes } from '@/lib/ring-store';
import { pointAt } from '@/lib/ring-geometry';
import { useLoop } from '../shell/LoopContext';
import { Button } from './Button';

const LONG_PRESS_MS = 600;
const MOVE_TOLERANCE_PX = 10;
const GRAB_PX = 22;
const SLOW_ZONE = 0.25;
const FLASH_MS = 240;

export interface KeptDetail {
  x: number | null;
  y: number | null;
  revolution: number;
}

export function KeepButton() {
  const { runtime } = useLoop();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const keep = useCallback(
    async (at: { x: number; y: number } | null) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      try {
        const canvases = ['loop-bg', 'loop-room', 'loop-ring']
          .map((id) => document.getElementById(id))
          .filter((el): el is HTMLCanvasElement => el instanceof HTMLCanvasElement);
        const code = encodeLoop(getNodes());
        const revolution = getFrame().revolution;
        const ok = await keepPng(canvases, `loop-${revolution}-${code}.png`);
        if (ok) {
          const root = document.documentElement;
          root.setAttribute('data-kept', '');
          setTimeout(() => root.removeAttribute('data-kept'), FLASH_MS);
          const detail: KeptDetail = { x: at?.x ?? null, y: at?.y ?? null, revolution };
          document.getElementById('stage')?.dispatchEvent(
            new CustomEvent<KeptDetail>('loop:kept', { detail }),
          );
        }
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [],
  );

  /* ---------------------------------------------------------- long-press */
  useEffect(() => {
    const stage = document.getElementById('stage');
    if (!stage) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let id = -1;
    let x0 = 0;
    let y0 = 0;

    function cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      id = -1;
    }

    function onDown(e: PointerEvent) {
      cancel();
      if (!e.isPrimary) return;
      const rect = stage!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const g = runtime.geometry;
      if (g.R <= 0) return;
      // Not on a node (including one this very press just placed on the band —
      // the ring's own listener ran first).
      for (const n of runtime.nodes) {
        const p = pointAt(n.a, n.r, g);
        if (Math.hypot(p.x - x, p.y - y) <= GRAB_PX) return;
      }
      // Not in SLOW's press-and-hold zone.
      if (Math.hypot(x - g.cx, y - g.cy) <= g.R * SLOW_ZONE) return;
      id = e.pointerId;
      x0 = e.clientX;
      y0 = e.clientY;
      timer = setTimeout(() => {
        timer = null;
        id = -1;
        void keep({ x, y });
      }, LONG_PRESS_MS);
    }
    function onMove(e: PointerEvent) {
      if (e.pointerId !== id) return;
      if (Math.hypot(e.clientX - x0, e.clientY - y0) > MOVE_TOLERANCE_PX) cancel();
    }
    function onUp(e: PointerEvent) {
      if (e.pointerId === id) cancel();
    }

    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);
    return () => {
      cancel();
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerup', onUp);
      stage.removeEventListener('pointercancel', onUp);
    };
  }, [keep, runtime]);

  return (
    <Button onClick={() => void keep(null)} data-control="keep" data-busy={busy ? 'true' : undefined}>
      keep this
    </Button>
  );
}
