'use client';

/**
 * `send the night as you have it` — §C.11. **OWNED BY WP-D.**
 *
 * It copies `location.origin + '/?s=' + slug + '#n=' + encodeState(knowledge)`
 * via `navigator.clipboard.writeText`, falling back to a hidden `<input>` and
 * `execCommand('copy')` — both inside `@/lib/share`. At the shipped 43 asides
 * the code is 15 characters and the whole link is about 45.
 *
 * The hash is never written to the address bar by the site itself, so Back is
 * never polluted. The link carries understanding and nothing else: there is
 * no name, no count and no person anywhere in eleven bytes of bitfields, and
 * the receiving site never claims the reader is someone else.
 *
 * It also mounts `useInboundShare` — the receiving half of the same
 * mechanism. That hook explains why it lives here and not in `Runtime.tsx`.
 */

import { useCallback, useState } from 'react';
import { copyToClipboard, encodeState, shareUrl } from '@/lib/share';
import { readKnowledge } from '@/lib/knowledge';
import { useInboundShare } from './InboundShare';
import { Button } from './Button';

export function ShareButton() {
  const [busy, setBusy] = useState(false);
  useInboundShare();

  const send = useCallback(() => {
    if (busy) return;
    setBusy(true);
    const slug = document.documentElement.dataset.s ?? '';
    const code = encodeState(readKnowledge());
    // An empty code is never written to the clipboard: a reader with nothing
    // to send still gets a real, working link to the account they are on.
    const url = code ? shareUrl(slug, code) : `${location.origin}/?s=${slug}`;
    void copyToClipboard(url).finally(() => setBusy(false));
  }, [busy]);

  return (
    <Button onClick={send} data-control="share" data-busy={busy ? 'true' : undefined}>
      send the night as you have it
    </Button>
  );
}
