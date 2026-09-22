'use client';

/**
 * `send your loop` — the §C.7 codec, the clipboard, and nothing else. **WP3.**
 *
 * Copies `location.origin + '/?s=' + slug + '#l=' + code` via
 * navigator.clipboard.writeText, falling back to a hidden input and
 * execCommand('copy') (both inside `@/lib/share`). On success the caption
 * shows `copied. it travels.` for 2 s. The code is also remembered in
 * `state.kept` (up to 12), which is what puts the visitor's loop into the
 * GARDEN field for the rest of the session.
 *
 * The hash is never written to the address bar by the site itself — only the
 * clipboard receives it — so the back button is never polluted (§C.7).
 */

import { useState } from 'react';
import { copyToClipboard, encodeLoop, shareUrl } from '@/lib/share';
import { getFrame } from '@/lib/clock';
import { getNodes } from '@/lib/ring-store';
import { readState, writeState } from '@/lib/storage';
import { useLoop } from '../shell/LoopContext';
import { Button } from './Button';

const COPIED_MS = 2000;

export function ShareButton() {
  const { section, say } = useLoop();
  const [busy, setBusy] = useState(false);

  async function share() {
    if (busy) return;
    setBusy(true);
    try {
      const f = getFrame();
      const state = readState();
      const code = encodeLoop(getNodes(), {
        reverse: f.dir === -1 || state.reverse,
        slow: f.periodMs > 4000 || state.slow,
      });
      const ok = await copyToClipboard(shareUrl(section, code));
      const kept = state.kept.filter((k) => k !== code);
      writeState({ kept: [...kept, code].slice(-12) });
      if (ok) say('copied. it travels.', COPIED_MS);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button onClick={() => void share()} data-control="share" data-busy={busy ? 'true' : undefined}>
      send your loop
    </Button>
  );
}
