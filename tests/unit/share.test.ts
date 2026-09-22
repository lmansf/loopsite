/**
 * tests/unit/share.test.ts — the codec. **OWNED BY WP-D.** Spec: §C.11, §H.2.
 *
 * The acceptance, in full:
 *   - 10 000 random states round-trip byte-exactly at the shipped 43 asides;
 *   - every boundary: all bits set, none set, every `A` from 1 to 8;
 *   - a 15-character code at the shipped 43 asides;
 *   - every single-character mutation of a valid code either decodes to the
 *     same state or is rejected — never throws, never reports an error;
 *   - a truncated aside field is zero-extended, an over-long one is rejected;
 *   - hostile input of every shape is refused silently.
 *
 * `encodePayload` / `decodePayload` are the structural codec and are what the
 * `A` sweep exercises; `decodeState` is what the site calls and adds this
 * corpus's aside-length policy. See the header of `src/lib/share.ts`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ASIDES,
  ASIDE_BYTES,
  CHECKSUM_SEED,
  CODEC_VERSION,
  MAX_CODE_CHARS,
  PAYLOAD_BYTES,
  type SharedState,
  asideKeys,
  decodePayload,
  decodeState,
  encodePayload,
  encodeState,
  shareUrl,
  stateFromKnowledge,
} from '../../src/lib/share.ts';
import { ACCOUNT_IDS, CONTRADICTIONS } from '../../src/lib/knowledge.ts';
import type { Knowledge } from '../../src/lib/types.ts';

/* ------------------------------------------------------------ the shape */

test('the payload length is computed from the corpus, not assumed', () => {
  const A = Math.ceil(ASIDES.length / 8);
  assert.equal(CODEC_VERSION, 1);
  assert.equal(CHECKSUM_SEED, 0x5a);
  assert.equal(ASIDES.length, 43, 'the shipped corpus has 43 asides, not the 40 the concept assumed');
  assert.equal(A, 6, 'a fixed 5-byte field would silently drop three');
  assert.equal(ASIDE_BYTES, A);
  assert.equal(PAYLOAD_BYTES, 11, 'L = 5 + A bytes');
});

test('a full state is 15 base64url characters at 43 asides', () => {
  const full: SharedState = {
    version: 1,
    belief: 2,
    pass: 3,
    visited: 0x0fff,
    contradictions: (1 << CONTRADICTIONS.length) - 1,
    asides: new Uint8Array(ASIDE_BYTES).fill(0xff),
  };
  const code = encodePayload(full);
  assert.equal(code.length, 15, `expected 15 characters, got ${code.length} (${code})`);
  assert.match(code, /^[A-Za-z0-9_-]+$/, 'base64url, padding stripped');
  assert.equal(shareUrl('road', code).length, `/?s=road#n=`.length + 15);
});

/* --------------------------------------------------------- the round trip */

/** A deterministic PRNG, so a failure is reproducible from its seed. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function randomState(r: () => number, asideBytes: number): SharedState {
  const asides = new Uint8Array(asideBytes);
  for (let i = 0; i < asideBytes; i++) asides[i] = Math.floor(r() * 256);
  return {
    version: 1,
    belief: Math.floor(r() * 3) as 0 | 1 | 2,
    pass: Math.floor(r() * 4),
    visited: Math.floor(r() * 0x10000),
    contradictions: Math.floor(r() * 256),
    asides,
  };
}

function same(a: SharedState, b: SharedState): boolean {
  return (
    a.version === b.version &&
    a.belief === b.belief &&
    a.pass === b.pass &&
    a.visited === b.visited &&
    a.contradictions === b.contradictions &&
    a.asides.length === b.asides.length &&
    a.asides.every((v, i) => v === b.asides[i])
  );
}

test('10 000 random states round-trip byte-exactly', () => {
  const r = rng(0x10ff);
  for (let n = 0; n < 10_000; n++) {
    const state = randomState(r, ASIDE_BYTES);
    const code = encodePayload(state);
    const back = decodeState(code);
    assert.ok(back, `run ${n}: ${code} failed to decode`);
    assert.ok(same(state, back), `run ${n}: ${code} decoded to a different state`);
    assert.equal(encodePayload(back), code, `run ${n}: re-encoding changed the code`);
  }
});

test('every A from 1 to 8 round-trips byte-exactly', () => {
  const r = rng(0xa51de5);
  for (let a = 1; a <= 8; a++) {
    for (let n = 0; n < 200; n++) {
      const state = randomState(r, a);
      const code = encodePayload(state);
      const back = decodePayload(code);
      assert.ok(back, `A=${a}: ${code} failed to decode`);
      assert.equal(back.asides.length, a, `A=${a}: the aside field changed length`);
      assert.ok(same(state, back), `A=${a}: ${code} decoded to a different state`);
      assert.equal(encodePayload(back), code);
    }
  }
});

test('the boundaries: nothing set, everything set, both beliefs', () => {
  const empty: SharedState = {
    version: 1,
    belief: 0,
    pass: 0,
    visited: 0,
    contradictions: 0,
    asides: new Uint8Array(ASIDE_BYTES),
  };
  const emptyCode = encodePayload(empty);
  assert.equal(emptyCode.length, 15, 'the empty state is still a full-length payload');
  assert.ok(same(empty, decodeState(emptyCode) as SharedState));
  assert.equal(asideKeys(empty).size, 0);

  for (const belief of [0, 1, 2] as const) {
    const full: SharedState = {
      version: 1,
      belief,
      pass: 3,
      visited: 0xffff,
      contradictions: 0xff,
      asides: new Uint8Array(ASIDE_BYTES).fill(0xff),
    };
    const back = decodeState(encodePayload(full));
    assert.ok(back, `belief ${belief}: failed to decode`);
    assert.ok(same(full, back));
    assert.equal(back.belief, belief);
  }
});

test('all 43 asides survive the round trip, and the 44th bit does not exist', () => {
  const all = new Uint8Array(ASIDE_BYTES);
  for (let i = 0; i < ASIDES.length; i++) {
    const at = i >> 3;
    all[at] = (all[at] as number) | (1 << (i & 7));
  }
  const state: SharedState = {
    version: 1,
    belief: 1,
    pass: 1,
    visited: 0x0fff,
    contradictions: (1 << CONTRADICTIONS.length) - 1,
    asides: all,
  };
  const back = decodeState(encodePayload(state));
  assert.ok(back);
  const keys = asideKeys(back);
  assert.equal(keys.size, 43, 'all forty-three, not the forty the concept assumed');
  assert.deepEqual([...keys], [...ASIDES]);
});

test('every one of the five contradictions survives the round trip', () => {
  assert.equal(CONTRADICTIONS.length, 5);
  for (let i = 0; i < CONTRADICTIONS.length; i++) {
    const state: SharedState = {
      version: 1,
      belief: 0,
      pass: 0,
      visited: 0,
      contradictions: 1 << i,
      asides: new Uint8Array(ASIDE_BYTES),
    };
    const back = decodeState(encodePayload(state));
    assert.ok(back);
    assert.equal(back.contradictions, 1 << i, `contradiction ${i} was lost`);
  }
});

test('every one of the twelve accounts survives the visited field', () => {
  assert.equal(ACCOUNT_IDS.length, 12);
  for (let i = 0; i < ACCOUNT_IDS.length; i++) {
    const back = decodeState(
      encodePayload({
        version: 1,
        belief: 0,
        pass: 0,
        visited: 1 << i,
        contradictions: 0,
        asides: new Uint8Array(ASIDE_BYTES),
      }),
    );
    assert.ok(back);
    assert.equal(back.visited, 1 << i, `account ${i} was lost`);
  }
});

/* --------------------------------------------------- forward compatibility */

test('a short aside field is accepted and zero-extended', () => {
  // An older, shorter corpus: A' = 1, so only the first eight asides can be
  // named and every later bit reads as 0. It must give, never take away.
  const short: SharedState = {
    version: 1,
    belief: 1,
    pass: 2,
    visited: 0b101,
    contradictions: 0b1,
    asides: Uint8Array.from([0xff]),
  };
  const code = encodePayload(short);
  const back = decodeState(code);
  assert.ok(back, 'a shorter payload must be accepted');
  assert.equal(back.asides.length, 1);
  const keys = asideKeys(back);
  assert.equal(keys.size, 8, 'the eight bits it carries');
  assert.deepEqual([...keys], ASIDES.slice(0, 8));
});

test('an over-long aside field is rejected', () => {
  for (let a = ASIDE_BYTES + 1; a <= 8; a++) {
    const code = encodePayload({
      version: 1,
      belief: 0,
      pass: 0,
      visited: 0,
      contradictions: 0,
      asides: new Uint8Array(a).fill(0xff),
    });
    assert.ok(decodePayload(code), `A=${a} is structurally valid`);
    assert.equal(decodeState(code), null, `A=${a} must be refused by this corpus`);
  }
});

test('a payload outside L = 6..13 is rejected', () => {
  for (const a of [0, 9, 20]) {
    const bytes = new Uint8Array(5 + a);
    bytes[0] = CODEC_VERSION;
    let sum = CHECKSUM_SEED ^ (bytes[0] as number);
    for (let i = 2; i < bytes.length; i++) sum ^= bytes[i] as number;
    bytes[1] = sum & 0xff;
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    const code = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    assert.equal(decodePayload(code), null, `L = ${5 + a} must be refused`);
    assert.equal(decodeState(code), null);
  }
});

test('a version other than 1 is rejected', () => {
  const code = encodePayload({
    version: 1,
    belief: 0,
    pass: 0,
    visited: 0,
    contradictions: 0,
    asides: new Uint8Array(ASIDE_BYTES),
  });
  const bytes = Buffer.from(code.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  for (let v = 0; v <= 15; v++) {
    if (v === CODEC_VERSION) continue;
    const copy = Uint8Array.from(bytes);
    copy[0] = ((copy[0] as number) & 0xf0) | v;
    let sum = CHECKSUM_SEED ^ (copy[0] as number);
    for (let i = 2; i < copy.length; i++) sum ^= copy[i] as number;
    copy[1] = sum & 0xff; // a well-formed payload of the wrong version
    let bin = '';
    for (const b of copy) bin += String.fromCharCode(b);
    const other = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    assert.equal(decodeState(other), null, `version ${v} must be refused`);
  }
});

/* ---------------------------------------------------------- the hostile */

test('every single-character mutation decodes to the same state or is rejected', () => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const r = rng(0xbadc0de);
  for (let n = 0; n < 40; n++) {
    const state = randomState(r, ASIDE_BYTES);
    const code = encodePayload(state);
    for (let i = 0; i < code.length; i++) {
      for (const ch of alphabet) {
        if (ch === code[i]) continue;
        const mutated = code.slice(0, i) + ch + code.slice(i + 1);
        let back: SharedState | null = null;
        assert.doesNotThrow(() => {
          back = decodeState(mutated);
        }, `decodeState(${mutated}) threw`);
        if (back === null) continue;
        assert.ok(
          same(state, back),
          `mutation ${mutated} of ${code} decoded to a DIFFERENT state`,
        );
      }
    }
  }
});

test('a truncated code is rejected', () => {
  const code = encodePayload({
    version: 1,
    belief: 2,
    pass: 1,
    visited: 0x0abc,
    contradictions: 0b10101,
    asides: new Uint8Array(ASIDE_BYTES).fill(0x5a),
  });
  for (let cut = 1; cut < code.length; cut++) {
    const short = code.slice(0, cut);
    let back: SharedState | null = null;
    assert.doesNotThrow(() => {
      back = decodeState(short);
    });
    if (back !== null) {
      // A truncation that happens to land on a shorter, well-formed payload is
      // legal by §C.11 — it is the zero-extension rule. It may only ever be a
      // SUBSET of the original.
      const original = asideKeys(decodeState(code) as SharedState);
      for (const key of asideKeys(back)) {
        assert.ok(original.has(key), `truncation to ${cut} invented the key ${key}`);
      }
    }
  }
});

test('decoding never throws, whatever it is handed', () => {
  const hostile = [
    '',
    ' ',
    '!',
    '=',
    'A',
    'AAAA',
    '////',
    '++++',
    'a'.repeat(4096),
    'A'.repeat(MAX_CODE_CHARS + 1),
    '-_-_-_-_',
    'AAAAAAAAAAA',
    '<script>alert(1)</script>',
    '../../etc/passwd',
    '%00%00%00',
    'null',
    'undefined',
    '\u0000\u0000',
    '😀😀😀😀',
    'AAAA\nAAAA',
    'AAAA AAAA',
    '#n=AAAAAAAAAAAAAAA',
  ];
  for (const code of hostile) {
    assert.doesNotThrow(() => decodeState(code), `decodeState(${JSON.stringify(code)}) threw`);
    assert.equal(
      decodeState(code),
      null,
      `decodeState(${JSON.stringify(code)}) should have been refused`,
    );
  }
  // and the things TypeScript says cannot happen
  for (const bad of [null, undefined, 0, 1, {}, [], true, () => 1]) {
    assert.doesNotThrow(() => decodeState(bad as unknown as string));
    assert.equal(decodeState(bad as unknown as string), null);
  }
});

test('a payload longer than the hard cap is refused before it is decoded', () => {
  const huge = 'A'.repeat(1_000_000);
  const started = Date.now();
  assert.equal(decodeState(huge), null);
  assert.ok(Date.now() - started < 200, 'the cap must be a length comparison, not a decode');
});

/* ------------------------------------------------------- from knowledge */

function knowledge(partial: Partial<Knowledge>): Knowledge {
  const keys = partial.keys ?? new Set<string>();
  return {
    keys,
    effective: keys,
    opens: {},
    visited: new Set(),
    contradictions: new Set(),
    belief: null,
    pass: 0,
    entry: {},
    ...partial,
  };
}

test('encodeState carries exactly what the reader holds, and nothing about them', () => {
  const k = knowledge({
    keys: new Set(ASIDES),
    visited: new Set(ACCOUNT_IDS),
    contradictions: new Set(CONTRADICTIONS.map((c) => c.id)),
    belief: 'hill',
    pass: 3,
  });
  const code = encodeState(k);
  assert.equal(code.length, 15);
  const back = decodeState(code);
  assert.ok(back);
  assert.equal(back.belief, 2, 'hill');
  assert.equal(back.pass, 3);
  assert.equal(back.visited, 0x0fff, 'twelve accounts, twelve bits');
  assert.equal(back.contradictions, 0b11111, 'five contradictions');
  assert.deepEqual([...asideKeys(back)], [...ASIDES]);

  // The whole payload is bitfields. There is nowhere in it to put a person.
  assert.equal(stateFromKnowledge(k).asides.length, ASIDE_BYTES);
  assert.equal(Object.keys(stateFromKnowledge(k)).length, 6);
});

test('an empty reader still encodes, and encodes to nothing held', () => {
  const code = encodeState(knowledge({}));
  assert.equal(code.length, 15);
  const back = decodeState(code);
  assert.ok(back);
  assert.equal(back.belief, 0);
  assert.equal(back.pass, 0);
  assert.equal(back.visited, 0);
  assert.equal(back.contradictions, 0);
  assert.equal(asideKeys(back).size, 0);
});

test('a key the corpus does not know is never encoded', () => {
  const code = encodeState(knowledge({ keys: new Set(['not-an-aside', 'contra:both']) }));
  const back = decodeState(code);
  assert.ok(back);
  assert.equal(asideKeys(back).size, 0);
});

test('a share url is the canonical route with the code in the hash', () => {
  assert.equal(shareUrl('road', 'ABCDEFGHIJKLMNO'), '/?s=road#n=ABCDEFGHIJKLMNO');
});
