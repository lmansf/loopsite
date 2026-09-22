'use client';

/**
 * `keep this` — the ring, as a PNG. Spec §C.6. **OWNED BY WP3 from here on.**
 */

import { keepPng } from '@/lib/keep';
import { encodeLoop } from '@/lib/share';
import { getFrame } from '@/lib/clock';
import { getNodes } from '@/lib/ring-store';
import { Button } from './Button';

export function KeepButton() {
  async function keep() {
    const canvases = ['loop-bg', 'loop-room', 'loop-ring']
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLCanvasElement => el instanceof HTMLCanvasElement);
    const code = encodeLoop(getNodes());
    await keepPng(canvases, `loop-${getFrame().revolution}-${code}.png`);
  }

  return (
    <Button onClick={() => void keep()} data-control="keep">
      keep this
    </Button>
  );
}
