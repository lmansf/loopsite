/**
 * src/lib/share.ts — the loop's URL hash codec.
 *
 * Spec: design/05-build-spec.md §C.7. FROZEN after WP0.
 *
 * The loop encodes into the **hash**; the room lives in the **search param**:
 *   https://<host>/?s=tone#l=BQHk8ZH2…
 *
 * Binary layout, then base64url with no padding:
 *   byte 0        header: bits 0-3 version (0b0001), bit 4 reverse, bit 5 slow,
 *                 bits 6-7 reserved (0)
 *   byte 1        XOR checksum of all subsequent bytes, seeded 0x5A
 *   byte 2 + 2i   byte0 = round(a · 256) & 0xFF
 *                 byte1 = (r << 4) | v
 *
 * A payload with an odd or <2 length, an unknown version, a failed checksum, or
 * n > 24 is rejected **silently** by returning null. A bad link never shows an
 * error; the site loads normally with the visitor's own (or empty) ring.
 */

import type { RingNode } from './types';

const VERSION = 0b0001;
const CHECKSUM_SEED = 0x5a;
const MAX_NODES = 24;

function mod1(x: number): number {
  const m = x % 1;
  return m < 0 ? m + 1 : m;
}

function newId(): string {
  try {
    return globalThis.crypto.randomUUID().slice(0, 8);
  } catch {
    return Math.random().toString(16).slice(2, 10);
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i] as number);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(code: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(code)) return null;
  const padded = code.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((code.length + 3) % 4);
  let bin: string;
  try {
    bin = atob(padded);
  } catch {
    return null;
  }
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff;
  return out;
}

export function encodeLoop(
  nodes: readonly RingNode[],
  flags?: { reverse?: boolean; slow?: boolean },
): string {
  const use = nodes.slice(0, MAX_NODES);
  const bytes = new Uint8Array(2 + use.length * 2);
  bytes[0] = (VERSION & 0x0f) | (flags?.reverse ? 1 << 4 : 0) | (flags?.slow ? 1 << 5 : 0);

  let checksum = CHECKSUM_SEED;
  for (let i = 0; i < use.length; i++) {
    const n = use[i] as RingNode;
    const b0 = Math.round(mod1(n.a) * 256) & 0xff;
    const r = Math.max(0, Math.min(15, Math.round(n.r)));
    const v = Math.max(0, Math.min(15, Math.round(n.v)));
    const b1 = ((r << 4) | v) & 0xff;
    bytes[2 + i * 2] = b0;
    bytes[3 + i * 2] = b1;
    checksum ^= b0;
    checksum ^= b1;
  }
  bytes[1] = checksum & 0xff;
  return bytesToBase64Url(bytes);
}

export function decodeLoop(
  code: string,
): { nodes: RingNode[]; reverse: boolean; slow: boolean } | null {
  if (typeof code !== 'string' || code.length === 0) return null;
  const bytes = base64UrlToBytes(code);
  if (!bytes) return null;
  if (bytes.length < 2 || bytes.length % 2 !== 0) return null;

  const header = bytes[0] as number;
  if ((header & 0x0f) !== VERSION) return null;

  let checksum = CHECKSUM_SEED;
  for (let i = 2; i < bytes.length; i++) checksum ^= bytes[i] as number;
  if ((checksum & 0xff) !== (bytes[1] as number)) return null;

  const n = (bytes.length - 2) / 2;
  if (n > MAX_NODES) return null;

  const nodes: RingNode[] = [];
  for (let i = 0; i < n; i++) {
    const b0 = bytes[2 + i * 2] as number;
    const b1 = bytes[3 + i * 2] as number;
    nodes.push({
      id: newId(),
      a: b0 / 256,
      r: (b1 >> 4) & 0x0f,
      v: b1 & 0x0f,
      born: 0,
    });
  }

  return { nodes, reverse: (header & (1 << 4)) !== 0, slow: (header & (1 << 5)) !== 0 };
}

export function shareUrl(slug: string, code: string): string {
  const origin = typeof location === 'undefined' ? '' : location.origin;
  return `${origin}/?s=${slug}#l=${code}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the execCommand path */
  }
  try {
    const input = document.createElement('input');
    input.setAttribute('aria-hidden', 'true');
    input.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    input.value = text;
    document.body.appendChild(input);
    input.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(input);
    return ok;
  } catch {
    return false;
  }
}
