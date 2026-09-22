'use client';

/**
 * `keep this` — the night, kept, as a PNG (§C.13, §I.10). **OWNED BY WP-D.**
 *
 * It reads what is actually on screen: the account's ambient canvas if one is
 * mounted, and the twelve night slots in whatever shape they are wearing.
 * With no figure mounted it keeps the marks alone — a true picture of the
 * reader's night rather than an empty frame, which is why it never refuses.
 *
 * No server round trip, ever. No new copy: the image is signed `loop` and
 * says nothing else.
 */

import { useCallback, useState } from 'react';
import { keepPng } from '@/lib/keep';
import type { AccountState } from '@/lib/types';
import { Button } from './Button';

/** The night's twelve slots, in nav order, as the reader is seeing them. */
function readMarks(): AccountState[] {
  const night = document.querySelector('.night:not([hidden])') ?? document.querySelector('.night');
  const slots = night ? [...night.querySelectorAll<HTMLElement>('a[data-slug]')] : [];
  return slots.map((slot) => {
    const state = slot.dataset.state;
    return state === 'read' || state === 'changed' ? state : 'unread';
  });
}

/** The account's ambient canvas, if WP-C's figure has mounted one. */
function readCanvas(): HTMLCanvasElement | null {
  for (const c of document.querySelectorAll<HTMLCanvasElement>('canvas')) {
    if (c.width > 0 && c.height > 0 && c.getClientRects().length > 0) return c;
  }
  return null;
}

export function KeepButton() {
  const [busy, setBusy] = useState(false);

  const keep = useCallback(() => {
    if (busy) return;
    setBusy(true);
    void keepPng({ canvas: readCanvas(), marks: readMarks(), filename: 'loop.png' }).finally(() =>
      setBusy(false),
    );
  }, [busy]);

  return (
    <Button onClick={keep} data-control="keep" data-busy={busy ? 'true' : undefined}>
      keep this
    </Button>
  );
}
