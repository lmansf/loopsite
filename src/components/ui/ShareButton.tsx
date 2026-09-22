'use client';

/**
 * `send the night as you have it` — §C.11. **OWNED BY WP-D.**
 *
 * It copies `location.origin + '/?s=' + slug + '#n=' + encodeState(knowledge)`
 * via `navigator.clipboard.writeText`, falling back to a hidden `<input>` and
 * `execCommand('copy')` — both inside `@/lib/share`.
 *
 * `encodeState` is WP-D's and is not written yet, so until it lands this
 * copies the plain account link: a real, working link to the right account,
 * carrying no state. It never copies an empty or half-formed code, and the
 * hash is never written to the address bar by the site itself, so Back is
 * never polluted.
 */

import { useCallback, useState } from 'react';
import { copyToClipboard, encodeState, shareUrl } from '@/lib/share';
import { readKnowledge } from '@/lib/knowledge';
import { Button } from './Button';

export function ShareButton() {
  const [busy, setBusy] = useState(false);

  const send = useCallback(() => {
    if (busy) return;
    setBusy(true);
    const slug = document.documentElement.dataset.s ?? '';
    const code = encodeState(readKnowledge());
    const url = code ? shareUrl(slug, code) : `${location.origin}/?s=${slug}`;
    void copyToClipboard(url).finally(() => setBusy(false));
  }, [busy]);

  return (
    <Button onClick={send} data-control="share" data-busy={busy ? 'true' : undefined}>
      send the night as you have it
    </Button>
  );
}
