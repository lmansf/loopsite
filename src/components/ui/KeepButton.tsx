'use client';

/**
 * `keep this` — the night, kept, as a PNG (§I.10). **OWNED BY WP-D.**
 *
 * WP-D composites the account's ambient canvas with the night's twelve marks
 * drawn into it, signed `loop`, through the retained `keepPng`; with no figure
 * mounted it draws the marks alone. Neither the figures nor that fallback
 * exists yet, so what is here is the honest half: if a canvas is mounted it is
 * kept, and if none is it does nothing rather than downloading an empty frame.
 *
 * No server round trip, ever.
 */

import { useCallback, useState } from 'react';
import { keepPng } from '@/lib/keep';
import { Button } from './Button';

export function KeepButton() {
  const [busy, setBusy] = useState(false);

  const keep = useCallback(() => {
    if (busy) return;
    const canvases = [...document.querySelectorAll<HTMLCanvasElement>('canvas')];
    if (canvases.length === 0) return;
    setBusy(true);
    void keepPng(canvases, 'loop.png').finally(() => setBusy(false));
  }, [busy]);

  return (
    <Button onClick={keep} data-control="keep" data-busy={busy ? 'true' : undefined}>
      keep this
    </Button>
  );
}
