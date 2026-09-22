/**
 * src/lib/keep.ts — the night, kept, as a PNG.
 *
 * Spec: design/11-narrative-build-spec.md §C.13, §G (WP-D), §I.10.
 * **OWNED BY WP-D.** Rewritten for the narrative build: the ring it used to
 * composite no longer exists.
 *
 * It composites what is actually on the reader's screen — the account's
 * ambient canvas, and the night's twelve marks in the three shapes they are
 * wearing right now — frames it, signs it `loop`, and downloads it. With no
 * figure mounted (a lazy chunk that has not landed, or reduced motion before
 * the still is drawn) it draws the marks alone, which is still a true picture
 * of the reader's night rather than an empty frame.
 *
 * **No server round trip, ever**, and no new copy: `loop` is the only string
 * in the image and §C.13 fixes it. The marks carry no numerals and no names.
 *
 * The three shapes are the night's own (§C.7), redrawn in canvas so the image
 * says what the page says without colour doing the work:
 *
 *   unread   a hollow ring
 *   read     a filled disc with an inner hairline
 *   changed  a filled disc with a SECOND SHORT BAR above it
 */

import type { AccountState } from './types.ts';
import { rgba, token } from './tokens.ts';

/** The kept image, in CSS pixels before the DPR multiply. */
const W = 1024;
const H = 640;
const INSET = 24;

export interface KeepInput {
  /** The account's ambient canvas, if one is mounted. */
  canvas?: HTMLCanvasElement | null;
  /** The night's twelve slots, in nav order. */
  marks: readonly AccountState[];
  filename: string;
}

function download(url: string, filename: string, revoke: boolean): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (revoke) URL.revokeObjectURL(url);
}

/** One slot, at (x, y), in the shape its state wears on the page. */
function drawMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  state: AccountState,
  canvasColor: string,
): void {
  const r = 7;
  if (state === 'unread') {
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba('--c-border-strong', 1);
    ctx.beginPath();
    ctx.arc(x, y, r - 0.5, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = rgba('--c-accent', 1);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  // the inner hairline rule: a 2 px ring of the page's own ground
  ctx.lineWidth = 2;
  ctx.strokeStyle = canvasColor;
  ctx.beginPath();
  ctx.arc(x, y, r - 1, 0, Math.PI * 2);
  ctx.stroke();
  if (state === 'changed') {
    // the second short bar, above — a shape, not a colour
    ctx.fillStyle = rgba('--c-accent-hi', 1);
    ctx.fillRect(x - 5, y - r - 8, 10, 2);
  }
}

/**
 * Composite, frame, sign and download. Returns false if the browser will not
 * give us a 2D context or a blob — in which case nothing is downloaded and
 * nothing is said, because a failed keep is not an error the reader caused.
 */
export async function keepPng(input: KeepInput): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  const dpr = Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, 2);
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(W * dpr));
  out.height = Math.max(1, Math.round(H * dpr));
  const ctx = out.getContext('2d');
  if (!ctx) return false;

  const ground = token('--c-canvas') || '#06070A';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, W, H);

  // The ambient figure, scaled to cover. It is decorative on the page and it
  // is decorative here; if it is not mounted the image is the marks alone.
  const source = input.canvas;
  if (source && source.width > 0 && source.height > 0) {
    const sw = source.width;
    const sh = source.height;
    const scale = Math.max(W / sw, H / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    try {
      ctx.drawImage(source, (W - dw) / 2, (H - dh) / 2, dw, dh);
    } catch {
      /* a tainted or zero-sized canvas is simply not drawn */
    }
  }

  // The twelve marks, centred, in nav order.
  const marks = input.marks.slice(0, 24);
  if (marks.length > 0) {
    const gap = 36;
    const span = (marks.length - 1) * gap;
    const y = Math.round(H / 2);
    let x = Math.round((W - span) / 2);
    for (const state of marks) {
      drawMark(ctx, x, y, state, ground);
      x += gap;
    }
  }

  // A 1 px frame, and the word `loop` bottom-right inside it (§C.13).
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba('--c-border', 1);
  ctx.strokeRect(INSET + 0.5, INSET + 0.5, W - INSET * 2 - 1, H - INSET * 2 - 1);
  ctx.fillStyle = rgba('--c-text-muted', 1);
  ctx.font = `12px ${token('--font-mono') || 'monospace'}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('loop', W - INSET - 12, H - INSET - 12);

  const blob = await new Promise<Blob | null>((resolve) => {
    if (typeof out.toBlob !== 'function') {
      resolve(null);
      return;
    }
    try {
      out.toBlob((b) => resolve(b), 'image/png');
    } catch {
      resolve(null);
    }
  });

  try {
    if (blob) {
      download(URL.createObjectURL(blob), input.filename, true);
      return true;
    }
    download(out.toDataURL('image/png'), input.filename, false);
    return true;
  } catch {
    return false;
  }
}
