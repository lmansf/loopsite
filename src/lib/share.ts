/**
 * src/lib/share.ts — the state codec and the clipboard.
 *
 * Spec: design/11-narrative-build-spec.md §C.11, §D.2. **OWNED BY WP-D.**
 *
 * WP-N left this file at its signatures with the codec unimplemented: WP-N is
 * explicitly forbidden to write it (§G, WP-N "Must not"), and WP-D's
 * acceptance is 10 000 random round trips plus every boundary. What is here is
 * real and finished:
 *
 *   - the byte layout, written down, so WP-D implements a specification and
 *     not a guess;
 *   - `encodeAsideMask` / `decodeAsideMask`, re-exported from the engine,
 *     because `loop:v2.entry` needs them before any of the codec exists;
 *   - `shareUrl` and `copyToClipboard`, retained verbatim from WP0.
 *
 * `encodeState` returns '' and `decodeState` returns null until WP-D lands.
 * Both are safe: an empty code is never written to the clipboard and a null
 * decode is exactly what a malformed payload must produce — silently, with
 * the site loading normally on the reader's own state (§C.11).
 *
 * THE LAYOUT. Binary, then base64url with padding stripped. With
 * `N = ASIDES.length` and `A = ceil(N / 8)`, the payload length is `L = 5 + A`:
 *
 *   | offset | bytes | meaning                                                |
 *   |--------|-------|--------------------------------------------------------|
 *   | 0      | 1     | (version & 0x0F) | ((belief & 3) << 4) | ((pass & 3) << 6) |
 *   | 1      | 1     | XOR of bytes 2 … L-1, seeded 0x5A                       |
 *   | 2–3    | 2     | visited bitfield, little-endian, bit i = ACCOUNT_IDS[i] |
 *   | 4      | 1     | contradictions bitfield, bit i = CONTRADICTIONS[i]      |
 *   | 5…4+A  | A     | aside bitfield, bit i of byte 5 + (i >> 3) = ASIDES[i]  |
 *
 * At the shipped 43 asides: A = 6, L = 11 bytes, 15 base64url characters.
 * A payload with A' < A is accepted and zero-extended; A' > A, L < 6, L > 13,
 * a version other than 1, or a failed checksum is **rejected silently**.
 * The aside bit order may never be rearranged, only appended to.
 */

import type { Knowledge } from './types.ts';

export const CODEC_VERSION = 1;

/** The checksum seed, byte 1. */
export const CHECKSUM_SEED = 0x5a;

/** The base64url aside bitfield used for `loop:v2.entry` and for bytes 5…4+A. */
export { encodeAsideMask, decodeAsideMask, ASIDES, ASIDE_BIT } from './knowledge.ts';

export interface SharedState {
  version: 1;
  belief: 0 | 1 | 2;
  /** 0..3 */
  pass: number;
  /** 12-bit mask */
  visited: number;
  /** 5-bit mask */
  contradictions: number;
  /** A bytes, §C.11 */
  asides: Uint8Array;
}

/* eslint-disable @typescript-eslint/no-unused-vars -- the signatures are the
   contract four agents code against; WP-D fills the bodies in. */

/** base64url, unpadded. WP-D. */
export function encodeState(k: Knowledge): string {
  return '';
}

/** null on any failure, silently — never an error, never a throw. WP-D. */
export function decodeState(code: string): SharedState | null {
  return null;
}

/* eslint-enable @typescript-eslint/no-unused-vars */

export function shareUrl(slug: string, code: string): string {
  const origin = typeof location === 'undefined' ? '' : location.origin;
  return `${origin}/?s=${slug}#n=${code}`;
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
