'use client';

/**
 * src/components/ui/InboundShare.tsx — the receiving half of §C.11.
 * **OWNED BY WP-D.**
 *
 * A link restores *understanding*, never identity. This merges the `#n=`
 * payload into the reader's own state, union-only, announces
 * `someone read it this way` for 3.5 s, and drops the hash so Back is never
 * polluted. It never names a person, never counts one, and never says the
 * state came from anybody — because it does not know, and there is nowhere
 * in eleven bytes of bitfields to put it.
 *
 * ## Where it lives
 *
 * `Runtime.tsx` is WP-B's and is closed to WP-D (§G, WP-D "Must not touch"),
 * so the merge is a hook mounted from `ShareButton` — the control that owns
 * the other direction of the same mechanism. It is in the Footer, which is in
 * the tree on every route, so it runs exactly once per load.
 *
 * ## When it runs, and why that moment
 *
 * After hydration, deferred one task. Two constraints fix it there:
 *
 *  1. **CLS.** `boot.ts` is frozen and writes `#loop-keys` from storage only;
 *     it cannot see the hash. Merging *before* the runtime's entry layout
 *     effect would materialise the shared keys' blocks at hydration — after
 *     first paint — and that is a layout shift on the one route Lighthouse
 *     measures. §C.6's rule is the same rule from the other side: **nothing
 *     ever appears while the reader is looking at it.**
 *  2. **The night has to hear about it.** The runtime subscribes to the
 *     engine in a passive effect, and the Footer commits before it, so a
 *     merge in our own passive effect would repaint nothing. One task later,
 *     the subscription exists and the twelve marks, the hub and the
 *     announcement all land together.
 *
 * So an inbound link behaves exactly as pressing a word does: the account on
 * screen is untouched, the night lights up with what is now available, and
 * the blocks materialise the next time the reader enters an account. On the
 * next load `boot.ts` finds the merged keys in storage and paints the lot
 * before the first frame.
 */

import { useEffect } from 'react';
import { applyInboundState } from '@/lib/share';
import { useUrlState } from '@/lib/url-state';

/** §C.13. The only string this module can ever put on the page. */
const CAPTION = 'someone read it this way';
const CAPTION_MS = 3500;

/** Once per load, whoever asks. The merge is union-only, so a second call is a no-op anyway. */
let done = false;

/** Test-only. */
export function __resetInboundForTest(): void {
  done = false;
}

export function useInboundShare(): void {
  const { code, clearCode } = useUrlState();

  useEffect(() => {
    if (done || !code) return;
    let caption: ReturnType<typeof setTimeout> | null = null;
    // Deferred one task, not set here, so a Strict Mode double-invoke in dev
    // cancels the first attempt instead of spending the one merge on it.
    const task = setTimeout(() => {
      if (done) return;
      done = true;
      const merged = applyInboundState(code);
      // The hash goes whether or not it decoded: a code the site cannot read
      // is not something to leave in the address bar, and dropping it keeps
      // Back one press from wherever the reader deliberately went (§C.11).
      clearCode();
      if (!merged) return;
      const live = document.getElementById('loop-live');
      if (!live) return;
      live.textContent = CAPTION;
      caption = setTimeout(() => {
        if (live.textContent === CAPTION) live.textContent = '';
      }, CAPTION_MS);
    }, 0);
    return () => {
      clearTimeout(task);
      if (caption) clearTimeout(caption);
    };
  }, [code, clearCode]);
}
