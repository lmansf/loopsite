'use client';

/**
 * `send your loop` — the §C.7 codec, the clipboard, and nothing else.
 * **OWNED BY WP3 from here on.**
 *
 * The hash is not written to the address bar by the site itself, only here, on
 * an explicit share — so the back button is never polluted.
 */

import { copyToClipboard, encodeLoop, shareUrl } from '@/lib/share';
import { getNodes } from '@/lib/ring-store';
import { readState, writeState } from '@/lib/storage';
import { useLoop } from '../shell/LoopContext';
import { Button } from './Button';

export function ShareButton() {
  const { section, say } = useLoop();

  async function share() {
    const code = encodeLoop(getNodes());
    const ok = await copyToClipboard(shareUrl(section, code));
    const kept = readState().kept;
    if (!kept.includes(code)) writeState({ kept: [...kept, code].slice(-12) });
    if (ok) say('copied. it travels.', 2000);
  }

  return (
    <Button onClick={() => void share()} data-control="share">
      send your loop
    </Button>
  );
}
