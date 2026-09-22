/**
 * src/lib/knowledge.ts — the key / lock / contradiction engine.
 *
 * Spec: design/11-narrative-build-spec.md §C.3–§C.6, §C.9, §D.2.
 * Written by WP-N; **owned by WP-B thereafter.**
 *
 * Pure except for the `./storage` calls it makes. It is the only module that
 * decides what a reader holds, what that unlocks and which accounts changed.
 *
 * ## It does not know the story
 *
 * This module runs in the browser. The corpus does not (§E item 3, §I.8): the
 * ~5000 words ship exactly once, in the document. So the engine imports
 * `./graph` — the generated, prose-free projection of the corpus — and never
 * `@/content/accounts`. `eslint.config.mjs` makes that a lint error rather
 * than a convention. Server code that needs the prose imports the corpus
 * directly; `auditCorpus()` below takes it as an argument for the same reason.
 *
 * ## The materialisation rule (§C.6)
 *
 * The key set that lays an account out is captured when the account is
 * ENTERED and is not consulted again until the next entry. Nothing ever
 * appears while the reader is looking at it. That is what holds CLS at 0, and
 * it is the reason `visibleBlockIds()` takes a key set as an argument instead
 * of reading the current one.
 */

import type { AccountId, Belief, Corpus, KeyId } from '../content/schema.ts';
import { ACCOUNT_IDS, allAsides, bracketedWords } from '../content/schema.ts';
import type { GraphAccount } from './graph.ts';
import { GRAPH } from './graph.ts';
import type { AccountState, Knowledge, KeyDelta, LoopState } from './types.ts';
import { markFound, markVisited, readState, writeState } from './storage.ts';

export type { GraphAccount, GraphBlock, GraphContradiction, KeyGraph } from './graph.ts';
export { GRAPH } from './graph.ts';
export { ACCOUNT_IDS } from '../content/schema.ts';

/* ------------------------------------------------------------ the indices */

/** account id -> its prose-free shape. */
export const ACCOUNTS: ReadonlyMap<AccountId, GraphAccount> = new Map(
  GRAPH.accounts.map((a) => [a.id, a] as const),
);

/**
 * Every aside id, in `allAsides(CORPUS)` order — account order, then authored
 * order inside the account. **This is the bit order of the share codec and it
 * may never be rearranged, only appended to** (§C.11).
 */
export const ASIDES: readonly KeyId[] = GRAPH.accounts.flatMap((a) => a.asides);

export const ASIDE_BIT: ReadonlyMap<KeyId, number> = new Map(ASIDES.map((id, i) => [id, i] as const));

/** key -> the account whose aside emits it. Drives `see also` (§C.10). */
export const EMITTERS: ReadonlyMap<KeyId, AccountId> = new Map(
  GRAPH.accounts.flatMap((a) => a.asides.map((k) => [k, a.id] as const)),
);

/** key -> every account that has a block needing it. */
export const CONSUMERS: ReadonlyMap<KeyId, readonly AccountId[]> = (() => {
  const out = new Map<KeyId, AccountId[]>();
  for (const a of GRAPH.accounts) {
    for (const b of a.blocks) {
      if (!b.needs) continue;
      const list = out.get(b.needs);
      if (list) {
        if (!list.includes(a.id)) list.push(a.id);
      } else {
        out.set(b.needs, [a.id]);
      }
    }
  }
  return out;
})();

export const CONTRADICTIONS: readonly { id: string; needs: readonly KeyId[] }[] = GRAPH.contradictions;

const ACCOUNT_SET = new Set<string>(ACCOUNT_IDS);

/* ----------------------------------------------------------- aside masks */

/**
 * The base64url aside bitfield used for `loop:v2.entry` (§C.6, §C.12) and, in
 * `share.ts`, for the aside field of the share codec. Bit *i* of byte
 * `floor(i / 8)` is `ASIDES[i]`; bytes are little-endian within themselves.
 */
export function encodeAsideMask(keys: ReadonlySet<KeyId>): string {
  const bytes = new Uint8Array(Math.ceil(ASIDES.length / 8));
  for (const key of keys) {
    const bit = ASIDE_BIT.get(key);
    if (bit === undefined) continue;
    const at = bit >> 3;
    bytes[at] = (bytes[at] ?? 0) | (1 << (bit & 7));
  }
  return bytesToBase64Url(bytes);
}

/** The inverse. An unreadable or over-long mask yields an empty set. */
export function decodeAsideMask(mask: string): Set<KeyId> {
  const out = new Set<KeyId>();
  const bytes = base64UrlToBytes(mask);
  if (!bytes) return out;
  for (let i = 0; i < ASIDES.length; i++) {
    const byte = bytes[i >> 3];
    if (byte === undefined) break;
    if (byte & (1 << (i & 7))) out.add(ASIDES[i] as KeyId);
  }
  return out;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i] as number);
  try {
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return '';
  }
}

function base64UrlToBytes(code: string): Uint8Array | null {
  if (typeof code !== 'string' || !/^[A-Za-z0-9_-]*$/.test(code)) return null;
  if (code.length === 0) return new Uint8Array(0);
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

/* ------------------------------------------------------- synthetic keys */

/**
 * The reserved synthetic namespace (§C.5). The shipped corpus uses none of
 * it, so everything but `all-twelve` is inert today; the engine supports it
 * because it is the only way the frozen schema can express the concept's pass
 * openings, contradiction effects and empty-handed ending.
 */
export const SYNTHETIC = {
  pass: (n: number) => `pass:${n}`,
  contra: (id: string) => `contra:${id}`,
  contraAll: 'contra:all',
  emptyHanded: 'empty-handed',
  silentPass: 'silent-pass',
  allTwelve: 'all-twelve',
  thrice: (key: KeyId) => `thrice:${key}`,
} as const;

/** Is `k` a legal synthetic key? A `needs` that is neither this nor an aside id fails the audit. */
export function isSyntheticKey(k: KeyId): boolean {
  if (k === SYNTHETIC.contraAll) return true;
  if (k === SYNTHETIC.emptyHanded) return true;
  if (k === SYNTHETIC.silentPass) return true;
  if (k === SYNTHETIC.allTwelve) return true;
  if (/^pass:[23]$/.test(k)) return true;
  if (/^contra:/.test(k)) return CONTRADICTIONS.some((c) => `contra:${c.id}` === k);
  if (/^thrice:/.test(k)) return ASIDE_BIT.has(k.slice('thrice:'.length));
  return false;
}

/**
 * Real keys plus every synthetic key they imply (§C.5). `empty-handed` and
 * `silent-pass` are the only keys that can be *lost*; that is safe because
 * blocks are evaluated only at entry.
 */
export function effectiveKeys(k: Knowledge): ReadonlySet<KeyId> {
  const out = new Set<KeyId>(k.keys);
  if (k.pass >= 2) out.add(SYNTHETIC.pass(2));
  if (k.pass >= 3) out.add(SYNTHETIC.pass(3));
  for (const id of k.contradictions) out.add(SYNTHETIC.contra(id));
  if (k.contradictions.size >= CONTRADICTIONS.length) out.add(SYNTHETIC.contraAll);
  if (k.keys.size === 0) out.add(SYNTHETIC.emptyHanded);
  if (k.visited.size >= ACCOUNT_IDS.length) {
    out.add(SYNTHETIC.allTwelve);
    if (k.keys.size === 0) out.add(SYNTHETIC.silentPass);
  }
  if (k.belief !== null) out.add(SYNTHETIC.allTwelve);
  for (const [key, n] of Object.entries(k.opens)) {
    if (n >= 3) out.add(SYNTHETIC.thrice(key));
  }
  return out;
}

/** The contradiction ids every key in `needs` is now held for. */
function earnedContradictions(keys: ReadonlySet<KeyId>): Set<string> {
  const out = new Set<string>();
  for (const c of CONTRADICTIONS) {
    if (c.needs.every((n) => keys.has(n))) out.add(c.id);
  }
  return out;
}

/* ------------------------------------------------------------- the state */

let snapshot: Knowledge | null = null;
let listeners: Array<(k: Knowledge) => void> = [];

function fromState(s: LoopState): Knowledge {
  const keys = new Set<KeyId>(s.keys.filter((k) => ASIDE_BIT.has(k)));
  const visited = new Set<AccountId>(
    s.visited.filter((v): v is AccountId => ACCOUNT_SET.has(v)),
  );
  const entry: Record<string, ReadonlySet<KeyId>> = {};
  for (const [id, mask] of Object.entries(s.entry)) {
    if (ACCOUNT_SET.has(id)) entry[id] = decodeAsideMask(mask);
  }
  const base: Knowledge = {
    keys,
    effective: keys,
    opens: { ...s.opens },
    visited,
    contradictions: new Set(s.collected),
    belief: s.belief === 1 ? 'valley' : s.belief === 2 ? 'hill' : null,
    pass: s.pass,
    entry,
  };
  // Contradictions are recomputed, never trusted: a key set always implies them.
  const contradictions = new Set<string>([...base.contradictions, ...earnedContradictions(keys)]);
  const withContra: Knowledge = { ...base, contradictions };
  return { ...withContra, effective: effectiveKeys(withContra) };
}

/** The reader's knowledge, as of now. Cheap: it is cached until something changes. */
export function readKnowledge(): Knowledge {
  if (!snapshot) snapshot = fromState(readState());
  return snapshot;
}

/** Subscribe to every change. Returns the unsubscribe function. */
export function subscribe(fn: (k: Knowledge) => void): () => void {
  listeners = [...listeners, fn];
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

function refresh(): Knowledge {
  snapshot = fromState(readState());
  for (const l of listeners) l(snapshot);
  return snapshot;
}

/** Test-only. Drops the cached snapshot and every listener. */
export function __resetKnowledgeForTest(): void {
  snapshot = null;
  listeners = [];
}

/* ------------------------------------------------------------ the verbs */

/**
 * Grant a key. Idempotent, persisted immediately (debounced to disk), never
 * spent, never lost, never revoked (§C.4).
 *
 * Returns what changed: the accounts whose night slot must now read `changed`
 * and the contradictions earned in the same tick.
 */
export function grantKey(id: KeyId): KeyDelta {
  const before = readKnowledge();
  if (before.keys.has(id)) {
    return { key: id, changed: [], contradictions: [] };
  }
  const s = readState();
  writeState({ keys: [...s.keys.filter((k) => k !== id), id].slice(-96) });
  const after = refresh();

  const changed: AccountId[] = [];
  for (const account of ACCOUNT_IDS) {
    if (accountState(account, before) !== 'changed' && accountState(account, after) === 'changed') {
      changed.push(account);
    }
  }
  const earned: string[] = [];
  for (const cid of after.contradictions) {
    if (!before.contradictions.has(cid)) {
      earned.push(cid);
      markFound(cid);
    }
  }
  if (earned.length > 0) refresh();
  return { key: id, changed, contradictions: earned };
}

/** Count an open. On the third the engine grants `thrice:<key>` (§C.5). */
export function noteOpen(id: KeyId): void {
  if (!ASIDE_BIT.has(id)) return;
  const s = readState();
  const n = (s.opens[id] ?? 0) + 1;
  const opens = { ...s.opens, [id]: Math.min(n, 99) };
  writeState({ opens });
  refresh();
}

/**
 * An account was entered. Rewrites its entry mask (§C.6) — which is exactly
 * what clears its `changed` marker — and counts the visit. Call it in the
 * same layout effect that flips `html[data-s]`.
 */
export function markEntered(id: AccountId): void {
  const k = readKnowledge();
  const s = readState();
  const entry = { ...s.entry, [id]: encodeAsideMask(k.keys) };
  const visited = s.visited.includes(id) ? s.visited : [...s.visited, id];
  const visits = { ...s.visits, [id]: (s.visits[id] ?? 0) + 1 };
  // A full pass is twelve accounts entered, capped at 3 (§C.5).
  const pass = visited.length >= ACCOUNT_IDS.length ? Math.min(3, Math.max(s.pass, 1)) : s.pass;
  writeState({ entry, visited, visits, pass });
  refresh();
}

/** Store the belief, or clear it. Mirrored onto `html[data-belief]` by the runtime. */
export function setBelief(b: Belief | null): void {
  writeState({ belief: b === 'valley' ? 1 : b === 'hill' ? 2 : 0 });
  refresh();
}

/* ------------------------------------------------------- what is visible */

/**
 * An account is *changed* iff it has been visited AND some block in it needs
 * a key that is in the current effective set and was NOT in the set recorded
 * at that account's last entry (§C.6).
 */
export function accountState(id: AccountId, k: Knowledge): AccountState {
  if (!k.visited.has(id)) return 'unread';
  const account = ACCOUNTS.get(id);
  if (!account) return 'read';
  const then = k.entry[id] ?? new Set<KeyId>();
  for (const b of account.blocks) {
    if (!b.needs) continue;
    if (k.effective.has(b.needs) && !then.has(b.needs)) return 'changed';
  }
  return 'read';
}

/**
 * The ids of the blocks that exist for this account under these keys, in
 * render order. `keys` is the ENTRY key set, not the live one.
 *
 * Belief filtering: a block with no `belief` is always in; a block with one is
 * in only under that belief. With no belief stored the `valley` half shows,
 * which is the CSS default and therefore also what a zero-JS reader sees
 * (§C.9).
 */
export function visibleBlockIds(
  id: AccountId,
  keys: ReadonlySet<KeyId>,
  belief: Belief | null,
): string[] {
  const account = ACCOUNTS.get(id);
  if (!account) return [];
  const shown = belief ?? 'valley';
  const out: string[] = [];
  for (const b of account.blocks) {
    if (b.needs && !keys.has(b.needs)) continue;
    if (b.belief && b.belief !== shown) continue;
    out.push(b.id);
  }
  return out;
}

/** Every block of an account that is behind a key, whether held or not. */
export function lockedBlockIds(id: AccountId): string[] {
  return (ACCOUNTS.get(id)?.blocks ?? []).filter((b) => b.needs).map((b) => b.id);
}

/* --------------------------------------------------------- inbound links */

/** The shape `share.ts` decodes to. Declared here so the engine never imports it. */
export interface IncomingState {
  belief: 0 | 1 | 2;
  pass: number;
  /** 12-bit account mask, bit i = ACCOUNT_IDS[i] */
  visited: number;
  /** 5-bit mask, bit i = CONTRADICTIONS[i] */
  contradictions: number;
  /** the aside bitfield, §C.11 */
  asides: Uint8Array;
}

/**
 * Merge a decoded share link into the reader's own state (§C.11).
 *
 * **A link can only ever give.** Keys, visited accounts and contradictions are
 * unioned; belief is applied only if the reader has none; `pass` takes the
 * maximum. Nothing the reader earned is ever removed, and the site never
 * claims the reader is someone else.
 */
export function mergeIncoming(s: IncomingState): KeyDelta[] {
  const before = readKnowledge();
  const incomingKeys = new Set<KeyId>();
  for (let i = 0; i < ASIDES.length; i++) {
    const byte = s.asides[i >> 3];
    if (byte === undefined) break;
    if (byte & (1 << (i & 7))) incomingKeys.add(ASIDES[i] as KeyId);
  }

  const state = readState();
  const keys = [...state.keys];
  const fresh: KeyId[] = [];
  for (const k of incomingKeys) {
    if (!keys.includes(k)) {
      keys.push(k);
      fresh.push(k);
    }
  }
  const visited = [...state.visited];
  for (let i = 0; i < ACCOUNT_IDS.length; i++) {
    if (s.visited & (1 << i)) {
      const id = ACCOUNT_IDS[i] as string;
      if (!visited.includes(id)) visited.push(id);
    }
  }
  const collected = [...state.collected];
  for (let i = 0; i < CONTRADICTIONS.length; i++) {
    if (s.contradictions & (1 << i)) {
      const id = (CONTRADICTIONS[i] as { id: string }).id;
      if (!collected.includes(id)) collected.push(id);
    }
  }
  writeState({
    keys: keys.slice(-96),
    visited,
    collected,
    belief: state.belief === 0 ? s.belief : state.belief,
    pass: Math.max(state.pass, Math.min(3, s.pass)),
  });
  const after = refresh();

  const changed: AccountId[] = [];
  for (const account of ACCOUNT_IDS) {
    if (accountState(account, before) !== 'changed' && accountState(account, after) === 'changed') {
      changed.push(account);
    }
  }
  const earned: string[] = [];
  for (const cid of after.contradictions) {
    if (!before.contradictions.has(cid)) {
      earned.push(cid);
      markFound(cid);
    }
  }
  if (earned.length > 0) refresh();
  if (fresh.length === 0 && changed.length === 0 && earned.length === 0) return [];
  return fresh.length > 0
    ? fresh.map((key, i) => ({
        key,
        changed: i === 0 ? changed : [],
        contradictions: i === 0 ? earned : [],
      }))
    : [{ key: '', changed, contradictions: earned }];
}

/** Re-exported so the runtime and storage agree on who records a visit. */
export { markVisited };

/* -------------------------------------------------------------- the audit */

/**
 * The corpus laws, exported so the unit test and the runtime agree (§C.4).
 * Returns `[]` for a clean corpus; every string is one violation.
 *
 * It takes the corpus as an argument — it is never imported here, because
 * this module ships to the browser and the corpus does not.
 *
 *  1. every `needs` is an aside id or a legal synthetic key (§C.5);
 *  2. the graph is flat: no block is behind a key that is itself emitted
 *     inside a locked block, so there are no chains;
 *  3. every account is readable from an empty key set;
 *  4. no account locks a block behind a key it emits itself;
 *  5. `src/lib/graph.ts` still describes this corpus, block for block.
 */
export function auditCorpus(c: Corpus): string[] {
  const out: string[] = [];
  const asides = allAsides(c);
  const asideIds = new Set(asides.map((a) => a.id));
  const owner = new Map<string, string>();
  for (const a of c.accounts) for (const x of a.asides) owner.set(x.id, a.id);

  // (2) keys granted inside a locked block would chain one lock off another.
  const behindALock = new Set<string>();
  for (const a of c.accounts) {
    for (const b of a.blocks) {
      if (!b.needs) continue;
      for (const w of bracketedWords(b.text)) {
        const aside = a.asides.find((x) => x.word === w);
        if (aside) behindALock.add(aside.id);
      }
    }
  }

  for (const a of c.accounts) {
    for (const b of a.blocks) {
      if (b.needs) {
        if (!asideIds.has(b.needs) && !isSyntheticKey(b.needs)) {
          out.push(`${a.id}/${b.id}: needs '${b.needs}', which is neither an aside nor a legal synthetic key`);
        }
        if (behindALock.has(b.needs) && a.id !== 'four-seconds') {
          out.push(`${a.id}/${b.id}: needs '${b.needs}', which is itself behind a lock`);
        }
        if (owner.get(b.needs) === a.id && a.id !== 'four-seconds') {
          out.push(`${a.id}/${b.id}: locked behind a key it grants itself`);
        }
      }
    }
    if (a.id !== 'four-seconds' && !a.blocks.some((b) => !b.needs && !b.belief)) {
      out.push(`${a.id}: nothing to read from an empty key set`);
    }
  }
  for (const con of c.contradictions) {
    for (const k of con.needs) {
      if (!asideIds.has(k)) out.push(`contradiction ${con.id}: no aside grants '${k}'`);
    }
  }

  // (5) the generated graph must still describe this corpus.
  if (c.accounts.length !== GRAPH.accounts.length) {
    out.push(`graph.ts has ${GRAPH.accounts.length} accounts, the corpus has ${c.accounts.length}`);
  }
  for (const a of c.accounts) {
    const g = ACCOUNTS.get(a.id);
    if (!g) {
      out.push(`graph.ts is missing the account ${a.id}`);
      continue;
    }
    if (g.blocks.length !== a.blocks.length) {
      out.push(`graph.ts/${a.id}: ${g.blocks.length} blocks, the corpus has ${a.blocks.length}`);
    }
    a.blocks.forEach((b, i) => {
      const gb = g.blocks[i];
      if (!gb || gb.id !== b.id || gb.needs !== b.needs || gb.belief !== b.belief) {
        out.push(`graph.ts/${a.id}: block ${i} is out of date (${b.id})`);
      }
    });
    const gAsides = g.asides.join(',');
    const cAsides = a.asides.map((x) => x.id).join(',');
    if (gAsides !== cAsides) out.push(`graph.ts/${a.id}: the aside order is out of date`);
    if ((a.blankWhenLocked === true) !== (g.blank === true)) {
      out.push(`graph.ts/${a.id}: blankWhenLocked is out of date`);
    }
  }
  const gContra = GRAPH.contradictions.map((x) => `${x.id}:${x.needs.join('+')}`).join(',');
  const cContra = c.contradictions.map((x) => `${x.id}:${x.needs.join('+')}`).join(',');
  if (gContra !== cContra) out.push('graph.ts: the contradictions are out of date');

  return out;
}
