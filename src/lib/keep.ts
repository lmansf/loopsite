/**
 * src/lib/keep.ts — the ring, kept, as a PNG.
 *
 * Spec: design/05-build-spec.md §C.6. FROZEN after WP0.
 *
 * Composites the three stage canvases into one offscreen canvas at
 * min(devicePixelRatio, 2), frames it, signs it `loop`, and downloads it.
 * No server round trip, ever.
 */

import { rgba, token } from './tokens';

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

export async function keepPng(
  canvases: HTMLCanvasElement[],
  filename: string,
): Promise<boolean> {
  const source = canvases.filter((c): c is HTMLCanvasElement => !!c && c.width > 0 && c.height > 0);
  if (source.length === 0) return false;

  const dpr = Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, 2);
  const first = source[0] as HTMLCanvasElement;
  const cssW = first.clientWidth || first.width;
  const cssH = first.clientHeight || first.height;
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(cssW * dpr));
  out.height = Math.max(1, Math.round(cssH * dpr));
  const ctx = out.getContext('2d');
  if (!ctx) return false;

  ctx.fillStyle = token('--c-canvas') || '#06070A';
  ctx.fillRect(0, 0, out.width, out.height);
  for (const c of source) ctx.drawImage(c, 0, 0, out.width, out.height);

  // 1 px frame inset 24 px, and the word `loop` bottom-right inside it.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba('--c-border', 1);
  ctx.strokeRect(24.5, 24.5, cssW - 49, cssH - 49);
  ctx.fillStyle = rgba('--c-text-muted', 1);
  ctx.font = `12px ${token('--font-mono') || 'monospace'}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('loop', cssW - 36, cssH - 36);

  const blob = await new Promise<Blob | null>((resolve) => {
    if (typeof out.toBlob !== 'function') {
      resolve(null);
      return;
    }
    out.toBlob((b) => resolve(b), 'image/png');
  });

  try {
    if (blob) {
      download(URL.createObjectURL(blob), filename, true);
      return true;
    }
    download(out.toDataURL('image/png'), filename, false);
    return true;
  } catch {
    return false;
  }
}
