/**
 * src/lib/share.ts — the state codec and the clipboard.
 *
 * Spec: design/11-narrative-build-spec.md §C.11, §D.2. **OWNED BY WP-D.**
 *
 * A link carries *understanding*, never identity. Nothing encoded here names
 * a person, counts one, or lets the receiving site claim the reader is
 * someone else: the payload is eleven bytes of bitfields and there is nowhere
 * in it to put a name.
 *
 * THE LAYOUT. Binary, then base64url with padding stripped. With
 * `N = ASIDES.length` and `A = ceil(N / 8)`, the payload length is `L = 5 + A`:
 *
 *   | offset | bytes | meaning                                                |
 *   |--------|-------|--------------------------------------------------------|
 *   | 0      | 1     | (version & 0x0F) | ((belief & 3) << 4) | ((pass & 3) << 6) |
 *   | 1      | 1     | XOR of byte 0 and bytes 2 … L-1, seeded 0x5A            |
 *   | 2–3    | 2     | visited bitfield, little-endian, bit i = ACCOUNT_IDS[i] |
 *   | 4      | 1     | contradictions bitfield, bit i = CONTRADICTIONS[i]      |
 *   | 5…4+A  | A     | aside bitfield, bit i of byte 5 + (i >> 3) = ASIDES[i]  |
 *
 * At the shipped 43 asides: A = 6, L = 11 bytes, **15 base64url characters**.
 * A payload with A' < A is accepted and zero-extended; A' > A, L < 6, L > 13,
 * a version other than 1, or a failed checksum is **rejected silently**.
 * The aside bit order may never be rearranged, only appended to.
 *
 * ## The one departure from §C.11, and why
 *
 * §C.11 puts the checksum over **bytes 2 … L-1**, which leaves byte 0 — and
 * therefore the belief and the pass — unprotected. That cannot be reconciled
 * with §H.2's acceptance, "every single-character mutation either round-trips
 * or returns null": the first base64url character carries byte 0's top six
 * bits, so flipping it changes belief and pass while every checksummed byte
 * stays put, and the payload decodes cleanly to a *different* state. Fifteen
 * of the sixteen mutations of that character survive.
 *
 * The checksum therefore covers **byte 0 and bytes 2 … L-1**, seeded 0x5A.
 * Nothing else about the layout moves, the code is still 15 characters, and
 * the codec has never shipped, so there is no payload anywhere that this
 * breaks. Recorded here, in the file header four agents read, and in WP-D's
 * report.
 *
 * ## Two decoders, and why
 *
 * `decodePayload` is the *structure*: charset, length 6…13 (A of 1…8),
 * version, checksum. `decodeState` is the structure **plus this corpus's
 * policy** — an aside field longer than this build's `A` is refused, because
 * it can only have come from a corpus with more asides than this one has and
 * the surplus bits have no meaning here. The structural range is the codec's
 * for the whole life of the format; the policy moves whenever an aside is
 * appended. Separating them is what lets `tests/unit/share.test.ts` prove the
 * boundary at every `A` from 1 to 8 *and* prove that an over-long field is
 * refused today. The site only ever calls `decodeState`.
 *
 * ## The merge
 *
 * `applyInboundState` decodes and hands the result to `mergeIncoming`, which
 * is union-only: keys, visited accounts and contradictions are added, belief
 * is applied only to a reader who has none, `pass` takes the maximum. A link
 * can only ever give. See `src/components/ui/InboundShare.tsx` for when it
 * runs and why that moment is the one it is.
 */

import type { KeyId } from '../content/schema.ts';
import type { Knowledge } from './types.ts';
import { ACCOUNT_IDS, ASIDES, ASIDE_BIT, CONTRADICTIONS, mergeIncoming } from './knowledge.ts';

export const CODEC_VERSION = 1;

/** The checksum seed, byte 1. */
export const CHECKSUM_SEED = 0x5a;

/** The base64url aside bitfield used for `loop:v2.entry` and for bytes 5…4+A. */
export { encodeAsideMask, decodeAsideMask, ASIDES, ASIDE_BIT } from './knowledge.ts';

/** `A` for this build's corpus: 6 at the shipped 43 asides. */
export const ASIDE_BYTES = Math.ceil(ASIDES.length / 8);

/** `L` for this build's corpus: 11 bytes, 15 base64url characters. */
export const PAYLOAD_BYTES = 5 + ASIDE_BYTES;

/** The structural payload range, `A` of 1…8. Never widened without a version bump. */
const MIN_PAYLOAD_BYTES = 6;
const MAX_PAYLOAD_BYTES = 13;

/**
 * The hard cap. 13 bytes is 18 base64url characters; anything longer is
 * refused before a single byte is decoded, so a megabyte in the hash costs
 * one length comparison.
 */
export const MAX_CODE_CHARS = 24;

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

/* ------------------------------------------------------------- base64url */

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i] as number);
  try {
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return '';
  }
}

function fromBase64Url(code: string): Uint8Array | null {
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

/* ------------------------------------------------------------- the codec */

/** Byte 0 and bytes 2 … L-1, seeded 0x5A. See "the one departure", above. */
function checksum(bytes: Uint8Array): number {
  let sum = CHECKSUM_SEED ^ (bytes[0] as number);
  for (let i = 2; i < bytes.length; i++) sum ^= bytes[i] as number;
  return sum & 0xff;
}

/**
 * The bytes of a state, exactly as the table above lays them out. The aside
 * field is as long as `s.asides` — which is how the boundary sweep exercises
 * every `A` from 1 to 8 without inventing a corpus for each one.
 */
export function encodePayload(s: SharedState): string {
  const a = s.asides.length;
  const bytes = new Uint8Array(5 + a);
  bytes[0] = (CODEC_VERSION & 0x0f) | ((s.belief & 0x03) << 4) | ((s.pass & 0x03) << 6);
  bytes[2] = s.visited & 0xff;
  bytes[3] = (s.visited >> 8) & 0xff;
  bytes[4] = s.contradictions & 0xff;
  for (let i = 0; i < a; i++) bytes[5 + i] = (s.asides[i] as number) & 0xff;
  bytes[1] = checksum(bytes);
  return toBase64Url(bytes);
}

/**
 * The structural decode: charset, the hard cap, `L` of 6…13, version 1, and
 * the checksum. Returns null on any failure — silently, never a throw.
 * `decodeState` adds this corpus's aside-length policy on top.
 */
export function decodePayload(code: string): SharedState | null {
  try {
    if (typeof code !== 'string') return null;
    if (code.length === 0 || code.length > MAX_CODE_CHARS) return null;
    if (!/^[A-Za-z0-9_-]+$/.test(code)) return null;
    const bytes = fromBase64Url(code);
    if (!bytes) return null;
    const len = bytes.length;
    if (len < MIN_PAYLOAD_BYTES || len > MAX_PAYLOAD_BYTES) return null;
    const head = bytes[0] as number;
    if ((head & 0x0f) !== CODEC_VERSION) return null;
    if (checksum(bytes) !== bytes[1]) return null;
    const belief = ((head >> 4) & 0x03) as 0 | 1 | 2 | 3;
    if (belief === 3) return null; // 3 is not a belief; it is a corrupt nibble
    return {
      version: 1,
      belief,
      pass: (head >> 6) & 0x03,
      visited: (bytes[2] as number) | ((bytes[3] as number) << 8),
      contradictions: bytes[4] as number,
      asides: bytes.slice(5),
    };
  } catch {
    // Unreachable by construction, and here anyway: a reader must never see a
    // thrown error because someone mangled a link (§C.11).
    return null;
  }
}

/**
 * What the site decodes. Everything `decodePayload` refuses, plus an aside
 * field longer than this corpus's — which can only be a payload from a build
 * with more asides, whose surplus bits mean nothing here. A shorter field is
 * accepted and read as zero-extended (`asideKeys` below, and `mergeIncoming`,
 * both treat a missing byte as 0).
 *
 * null on any failure, silently — never an error, never a throw.
 */
export function decodeState(code: string): SharedState | null {
  const s = decodePayload(code);
  if (!s) return null;
  if (s.asides.length > ASIDE_BYTES) return null;
  return s;
}

/**
 * The aside keys a payload carries, in bit order. A field shorter than this
 * corpus's is zero-extended: the missing bytes grant nothing, they never
 * take anything away.
 */
export function asideKeys(s: SharedState): Set<KeyId> {
  const out = new Set<KeyId>();
  for (let i = 0; i < ASIDES.length; i++) {
    const byte = s.asides[i >> 3];
    if (byte === undefined) break; // zero-extension: every remaining bit is 0
    if (byte & (1 << (i & 7))) out.add(ASIDES[i] as KeyId);
  }
  return out;
}

/** The reader's knowledge as the wire sees it: bitfields, and nothing else. */
export function stateFromKnowledge(k: Knowledge): SharedState {
  const asides = new Uint8Array(ASIDE_BYTES);
  for (const key of k.keys) {
    const bit = ASIDE_BIT.get(key);
    if (bit === undefined) continue;
    const at = bit >> 3;
    asides[at] = (asides[at] ?? 0) | (1 << (bit & 7));
  }
  let visited = 0;
  for (let i = 0; i < ACCOUNT_IDS.length && i < 16; i++) {
    const id = ACCOUNT_IDS[i];
    if (id !== undefined && k.visited.has(id)) visited |= 1 << i;
  }
  let contradictions = 0;
  for (let i = 0; i < CONTRADICTIONS.length && i < 8; i++) {
    const c = CONTRADICTIONS[i];
    if (c !== undefined && k.contradictions.has(c.id)) contradictions |= 1 << i;
  }
  return {
    version: 1,
    belief: k.belief === 'valley' ? 1 : k.belief === 'hill' ? 2 : 0,
    pass: Math.max(0, Math.min(3, Math.floor(k.pass || 0))),
    visited,
    contradictions,
    asides,
  };
}

/** base64url, unpadded. 15 characters at the shipped 43 asides. */
export function encodeState(k: Knowledge): string {
  return encodePayload(stateFromKnowledge(k));
}

/* ------------------------------------------------------- inbound links */

/**
 * Merge a code into the reader's own state (§C.11). Union-only, by way of
 * `mergeIncoming`: keys, visited accounts and contradictions are added,
 * belief is applied only if the reader has none, `pass` takes the maximum.
 * **Nothing the reader earned is ever removed.**
 *
 * Returns true only if a real code was decoded and merged, which is the one
 * condition under which `someone read it this way` may be announced. A
 * malformed code returns false and the site carries on as if the hash had
 * never been there.
 */
export function applyInboundState(code: string | null | undefined): boolean {
  if (!code) return false;
  const s = decodeState(code);
  if (!s) return false;
  try {
    mergeIncoming(s);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------- the clipboard */

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
