/**
 * tests/unit/knowledge.test.ts — the engine and the four corpus laws.
 * Written by WP-N; **owned by WP-B thereafter.**
 *
 * What WP-N left is the part that has to be true before anyone builds on it:
 *
 *  - `src/lib/graph.ts` — the prose-free projection the engine runs on —
 *    still describes the real corpus, block for block. That is the guard that
 *    lets the engine stay out of the story (§E item 3). If it ever fails,
 *    regenerate with `node --experimental-strip-types scripts/gen-graph.mjs`.
 *  - the four corpus laws of §C.4, through `auditCorpus`.
 *  - the indices the share codec's bit order depends on (§C.11).
 *
 * WP-B adds granting, persistence, idempotence, the synthetic namespace, the
 * entry masks and the contradictions.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACCOUNT_IDS, allAsides } from '../../src/content/schema.ts';
import { CORPUS } from '../../src/content/accounts.ts';
import {
  ASIDES,
  ASIDE_BIT,
  CONSUMERS,
  CONTRADICTIONS,
  EMITTERS,
  auditCorpus,
  decodeAsideMask,
  encodeAsideMask,
  isSyntheticKey,
  visibleBlockIds,
} from '../../src/lib/knowledge.ts';

test('the generated graph still describes the corpus, and the corpus is lawful', () => {
  assert.deepEqual(
    auditCorpus(CORPUS),
    [],
    'auditCorpus found violations — if these name graph.ts, regenerate it',
  );
});

test('the aside bit order is allAsides(CORPUS), exactly', () => {
  assert.deepEqual([...ASIDES], allAsides(CORPUS).map((a) => a.id));
  assert.equal(ASIDES.length, 43);
  assert.equal(ASIDE_BIT.size, ASIDES.length);
  ASIDES.forEach((id, i) => assert.equal(ASIDE_BIT.get(id), i));
});

test('every key that anything reads is emitted by exactly one account', () => {
  for (const id of ASIDES) {
    assert.ok(EMITTERS.has(id), `${id} is emitted by nobody`);
  }
  for (const [key, accounts] of CONSUMERS) {
    assert.ok(EMITTERS.has(key), `${key} is consumed but granted by nobody`);
    assert.ok(accounts.length >= 1, `${key} is consumed by nobody`);
  }
  for (const c of CONTRADICTIONS) {
    for (const k of c.needs) assert.ok(EMITTERS.has(k), `${c.id}: nothing grants ${k}`);
  }

  // NOTE for WP-B. §G's WP-B acceptance says "every key has >= 1 emitter and
  // >= 1 consumer". The SHIPPED CORPUS does not satisfy the second half and
  // cannot be changed: 26 of the 43 asides unlock nothing and earn no
  // contradiction — they are colour, and the aside body is the whole reward.
  // Seventeen keys do real work. Asserting the spec's version would fail on a
  // frozen corpus, so what is asserted is the direction that can actually be
  // violated by a mistake: nothing may NEED a key that nothing GRANTS.
  const consumed = new Set<string>([...CONSUMERS.keys()]);
  for (const c of CONTRADICTIONS) for (const k of c.needs) consumed.add(k);
  assert.equal(consumed.size, 17, 'the number of keys that unlock something changed');
});

test('no account locks a block behind a key it emits itself', () => {
  for (const [key, accounts] of CONSUMERS) {
    const from = EMITTERS.get(key);
    for (const to of accounts) {
      if (to === 'four-seconds') continue;
      assert.notEqual(from, to, `${to} locks a block behind its own key ${key}`);
    }
  }
});

test('every account is readable from an empty key set', () => {
  const none = new Set<string>();
  for (const id of ACCOUNT_IDS) {
    const ids = visibleBlockIds(id, none, null);
    if (id === 'four-seconds') {
      // every block of `four seconds` needs a key: at zero keys it is seven
      // blank rules and their `see also` links, which is the point (§C.10).
      assert.equal(ids.length, 0);
      continue;
    }
    assert.ok(ids.length >= 5, `${id}: ${ids.length} blocks from an empty key set`);
  }
});

test('belief filters in pairs, and valley is the default', () => {
  const none = new Set<string>();
  for (const id of ACCOUNT_IDS) {
    const valley = visibleBlockIds(id, none, 'valley');
    const hill = visibleBlockIds(id, none, 'hill');
    const unset = visibleBlockIds(id, none, null);
    assert.equal(valley.length, hill.length, `${id}: the belief halves must pair`);
    assert.deepEqual(unset, valley, `${id}: the zero-JS default is valley`);
  }
});

test('the synthetic namespace is closed', () => {
  assert.ok(isSyntheticKey('all-twelve'));
  assert.ok(isSyntheticKey('pass:2'));
  assert.ok(isSyntheticKey('pass:3'));
  assert.ok(isSyntheticKey('contra:bridge'));
  assert.ok(isSyntheticKey('contra:all'));
  assert.ok(isSyntheticKey('empty-handed'));
  assert.ok(isSyntheticKey('silent-pass'));
  assert.ok(isSyntheticKey(`thrice:${ASIDES[0] as string}`));
  assert.ok(!isSyntheticKey('pass:4'));
  assert.ok(!isSyntheticKey('contra:nothing'));
  assert.ok(!isSyntheticKey('thrice:nothing'));
  assert.ok(!isSyntheticKey('anything-else'));
});

test('an aside mask round-trips, and a corrupt one is empty rather than an error', () => {
  const keys = new Set([ASIDES[0] as string, ASIDES[7] as string, ASIDES[42] as string]);
  const mask = encodeAsideMask(keys);
  assert.deepEqual([...decodeAsideMask(mask)].sort(), [...keys].sort());
  assert.equal(encodeAsideMask(new Set()).replace(/A/g, ''), '');
  assert.equal(decodeAsideMask('!!!!').size, 0);
  assert.equal(decodeAsideMask('').size, 0);
  // a short mask is zero-extended, never an error
  assert.equal(decodeAsideMask(mask.slice(0, 2)).size <= keys.size, true);
});

test('the graph is the corpus: any drift at all is a violation', () => {
  // The guard that lets the engine stay out of the story. If the corpus is
  // ever reopened, `node --experimental-strip-types scripts/gen-graph.mjs`
  // regenerates `src/lib/graph.ts` byte for byte; until then any difference
  // between the two is a defect, and this is where it is caught.
  const drifts: [string, (c: typeof CORPUS) => void][] = [
    ['a renamed block', (c) => void (c.accounts[0]!.blocks[0]!.id = 'dog-renamed')],
    ['a new block', (c) => void c.accounts[0]!.blocks.push({ id: 'dog-9', text: 'x.' })],
    ['a dropped block', (c) => void c.accounts[0]!.blocks.pop()],
    ['a moved lock', (c) => void (c.accounts[0]!.blocks[2]!.needs = 'two-clicks')],
    ['a rewritten belief', (c) => void (c.accounts[1]!.blocks[6]!.belief = 'hill')],
    ['a reordered aside', (c) => c.accounts[0]!.asides.reverse()],
    ['a changed contradiction', (c) => void (c.contradictions[0]!.needs = ['two-clicks'])],
    ['a lost account', (c) => void c.accounts.pop()],
  ];
  for (const [what, break_] of drifts) {
    const broken = structuredClone(CORPUS);
    break_(broken);
    assert.ok(auditCorpus(broken).length > 0, `${what} went unnoticed`);
  }
});

test('a corpus that breaks a law is caught', () => {
  const broken = structuredClone(CORPUS);
  const dog = broken.accounts[0];
  assert.ok(dog);
  dog.blocks[1] = { ...dog.blocks[1]!, needs: 'not-a-key' };
  const problems = auditCorpus(broken);
  assert.ok(problems.some((p) => p.includes('not-a-key')), problems.join('\n'));
});

/* ======================================================================== *
 *  WP-B — granting, persistence, the entry masks and the contradictions.
 *
 *  `node --test` has no DOM, so `storage.ts` keeps its state in memory: every
 *  read returns the default and every write is cached and never reaches a
 *  disk that is not there. That is exactly the "storage failure is silent and
 *  total" path of §C.12, so these tests are also the proof that the engine
 *  works with storage switched off. The two tests that need a RELOAD install
 *  a fake `window.localStorage` and flush to it.
 * ======================================================================== */

import {
  GATE_KEYS,
  __resetKnowledgeForTest,
  accountHasMore,
  accountState,
  decodeEntryMask,
  effectiveKeys,
  encodeEntryMask,
  grantKey,
  markEntered,
  noteOpen,
  readKnowledge,
  setBelief,
} from '../../src/lib/knowledge.ts';
import { __resetStorageForTest, flushState, readState } from '../../src/lib/storage.ts';

/** A reader who has just arrived, holding nothing, with nothing remembered. */
function freshReader(): void {
  __resetStorageForTest();
  __resetKnowledgeForTest();
}

/** Everything the corpus can grant. */
const ALL_KEYS = [...ASIDES];

test('a key is granted once, is never spent, and opening the word again grants nothing', () => {
  freshReader();
  const first = grantKey('one-press');
  assert.equal(first.key, 'one-press');
  assert.ok(readKnowledge().keys.has('one-press'));

  const again = grantKey('one-press');
  assert.deepEqual(again.changed, []);
  assert.deepEqual(again.contradictions, []);
  assert.equal(readKnowledge().keys.size, 1, 'one aside, one key');
  assert.equal(readState().keys.filter((k) => k === 'one-press').length, 1);
});

test('a key that no aside grants never reaches storage', () => {
  freshReader();
  grantKey('not-a-key');
  grantKey('contra:bridge'); // synthetic keys are COMPUTED, never granted
  assert.equal(readKnowledge().keys.size, 0);
  assert.deepEqual(readState().keys, []);
});

test('opens are counted, and the third one grants thrice:<key>', () => {
  freshReader();
  noteOpen('one-press');
  noteOpen('one-press');
  assert.ok(!readKnowledge().effective.has('thrice:one-press'));
  noteOpen('one-press');
  assert.equal(readKnowledge().opens['one-press'], 3);
  assert.ok(readKnowledge().effective.has('thrice:one-press'));
});

test('an account read before the key exists says more now, and stops saying it once read again', () => {
  freshReader();
  markEntered('dog');
  assert.equal(accountState('dog', readKnowledge()), 'read');

  // `one-press` is emitted by `switch` and consumed by `dog` — the §B journey.
  const delta = grantKey('one-press');
  assert.ok(delta.changed.includes('dog'), 'the dog says more now');
  assert.equal(accountState('dog', readKnowledge()), 'changed');
  assert.equal(accountState('switch', readKnowledge()), 'unread', 'never entered');

  markEntered('dog');
  assert.equal(accountState('dog', readKnowledge()), 'read', 'the marker clears on the re-read');
});

test('an account the reader has never opened still says it has something, and does not say it was read', () => {
  // §A.2's ten seconds: press a word in the ONE account a first-time reader
  // has entered, and a slot they have never visited must react. `two-clicks`
  // is the dog's second word and it is consumed by `lamp` and by `switch`.
  freshReader();
  markEntered('dog');
  for (const id of ACCOUNT_IDS) {
    assert.equal(accountHasMore(id, readKnowledge()), false, `${id} has nothing yet`);
  }

  grantKey('two-clicks');
  const k = readKnowledge();

  const more = ACCOUNT_IDS.filter((id) => accountHasMore(id, k));
  assert.deepEqual([...more], ['lamp', 'switch'], 'exactly the two consumers, never all twelve');
  // and the honest half: neither of them claims to have been read
  for (const id of more) {
    assert.equal(accountState(id, k), 'unread', `${id} is still unread`);
  }
  assert.equal(accountHasMore('dog', k), false, 'the account being read never grows a marker');
});

test('entering an account clears what it was holding for the reader', () => {
  freshReader();
  markEntered('dog');
  grantKey('two-clicks');
  assert.equal(accountHasMore('switch', readKnowledge()), true);

  markEntered('switch');
  const k = readKnowledge();
  assert.equal(accountHasMore('switch', k), false, 'it has been seen');
  assert.equal(accountState('switch', k), 'read');
  // the other one is untouched: the reader has still not been to the lamp
  assert.equal(accountHasMore('lamp', k), true);
  assert.equal(accountState('lamp', k), 'unread');
});

test('changed is exactly visited-and-has-more, so the three states are unchanged', () => {
  freshReader();
  markEntered('dog');
  markEntered('switch');
  grantKey('one-press');
  const k = readKnowledge();
  for (const id of ACCOUNT_IDS) {
    const expected = !k.visited.has(id) ? 'unread' : accountHasMore(id, k) ? 'changed' : 'read';
    assert.equal(accountState(id, k), expected, id);
  }
  assert.equal(accountState('dog', k), 'changed');
  assert.equal(accountState('road', k), 'unread', 'road has it too, and is still unread');
  assert.equal(accountHasMore('road', k), true);
});

test('the earned block is interleaved at its authored index, not appended', () => {
  freshReader();
  const before = visibleBlockIds('dog', new Set(), null);
  const after = visibleBlockIds('dog', new Set(['one-press']), null);
  assert.equal(after.length, before.length + 1);
  assert.equal(after[1], 'dog-outside', 'between dog-1 and dog-2, where it was written');
  assert.deepEqual(after.filter((id) => id !== 'dog-outside'), before);
});

test('a contradiction lands the moment both halves are held, and only then', () => {
  freshReader();
  assert.deepEqual(grantKey('two-clicks').contradictions, []);
  const delta = grantKey('one-press');
  assert.deepEqual(delta.contradictions, ['clicks']);
  assert.ok(readKnowledge().contradictions.has('clicks'));
  assert.ok(readKnowledge().effective.has('contra:clicks'));
  // it is earned once; holding it is not holding it twice
  assert.deepEqual(grantKey('two-clicks').contradictions, []);
});

test('a reader who has opened everything holds all five, and nothing else', () => {
  freshReader();
  for (const key of ALL_KEYS) grantKey(key);
  const k = readKnowledge();
  assert.equal(k.contradictions.size, CONTRADICTIONS.length);
  assert.equal(CONTRADICTIONS.length, 5);
  assert.ok(k.effective.has('contra:all'));
  for (const c of CONTRADICTIONS) assert.ok(k.contradictions.has(c.id));
});

test('nothing is reachable that should not be: every contradiction needs every one of its keys', () => {
  for (const c of CONTRADICTIONS) {
    for (const missing of c.needs) {
      freshReader();
      for (const key of c.needs) if (key !== missing) grantKey(key);
      assert.ok(
        !readKnowledge().contradictions.has(c.id),
        `${c.id} landed without ${missing}`,
      );
    }
  }
});

test('the entry mask remembers synthetic gates too, so a gated block is new exactly once', () => {
  assert.ok(GATE_KEYS.includes('all-twelve'), 'the belief choice is gated by a synthetic key');
  const held = new Set([ASIDES[0] as string, 'all-twelve']);
  const mask = encodeEntryMask(held);
  const back = decodeEntryMask(mask);
  assert.ok(back.has(ASIDES[0] as string));
  assert.ok(back.has('all-twelve'));
  // a mask written before gate bits existed is still read for what it said
  assert.deepEqual([...decodeEntryMask(encodeAsideMask(held))], [ASIDES[0]]);
  assert.equal(decodeEntryMask('!!!~!!!').size, 0);
  assert.ok(mask.length <= 32, 'storage caps an entry mask at 32 characters');
});

test('the belief is stored, reversible, and unlocks its own choice', () => {
  freshReader();
  assert.equal(readKnowledge().belief, null);
  setBelief('hill');
  assert.equal(readKnowledge().belief, 'hill');
  assert.ok(readKnowledge().effective.has('all-twelve'), 'a reader with a belief keeps the choice');
  setBelief('valley');
  assert.equal(readKnowledge().belief, 'valley');
  setBelief(null);
  assert.equal(readKnowledge().belief, null);
  assert.equal(readState().belief, 0);
});

test('the belief gates the halves of `both`, which is why it takes two readings', () => {
  // `lit-from-below` is in lamp's valley block, `lit-from-above` in its hill
  // block: the pair cannot be on screen at the same time (§I.13).
  const valley = visibleBlockIds('lamp', new Set(), 'valley');
  const hill = visibleBlockIds('lamp', new Set(), 'hill');
  assert.ok(valley.includes('lamp-valley') && !valley.includes('lamp-hill'));
  assert.ok(hill.includes('lamp-hill') && !hill.includes('lamp-valley'));
  const both = CONTRADICTIONS.find((c) => c.id === 'both');
  assert.deepEqual([...(both?.needs ?? [])], ['lit-from-below', 'lit-from-above']);
});

test('twelve accounts entered is a pass, and a second reading is a second pass', () => {
  freshReader();
  for (const id of ACCOUNT_IDS) markEntered(id);
  let k = readKnowledge();
  assert.equal(k.pass, 1);
  assert.ok(k.effective.has('all-twelve'), 'the choice is offered');
  assert.ok(!k.effective.has('pass:2'));
  assert.ok(k.effective.has('silent-pass'), 'twelve accounts, no keys');
  assert.ok(k.effective.has('empty-handed'));

  for (const id of ACCOUNT_IDS) markEntered(id);
  k = readKnowledge();
  assert.equal(k.pass, 2);
  assert.ok(k.effective.has('pass:2'));

  for (let n = 0; n < 3; n++) for (const id of ACCOUNT_IDS) markEntered(id);
  assert.equal(readKnowledge().pass, 3, 'capped at three');

  grantKey('one-press');
  k = readKnowledge();
  assert.ok(!k.effective.has('empty-handed'), 'one key is not empty-handed');
  assert.ok(!k.effective.has('silent-pass'));
});

test('four seconds is seven blanks at zero keys and seven sentences at seven', () => {
  const none = visibleBlockIds('four-seconds', new Set(), null);
  assert.deepEqual(none, []);
  const every = new Set(ALL_KEYS);
  assert.equal(visibleBlockIds('four-seconds', every, null).length, 7);
});

test('effectiveKeys never invents a key the reader does not hold', () => {
  freshReader();
  grantKey('one-press');
  const k = readKnowledge();
  const effective = effectiveKeys(k);
  for (const key of effective) {
    assert.ok(
      ASIDE_BIT.has(key) || isSyntheticKey(key),
      `${key} is neither an aside nor a legal synthetic key`,
    );
  }
  assert.ok(effective.has('one-press'));
  assert.ok(!effective.has('two-clicks'));
});

/* ---- the one thing that needs a disk: a reload ---- */

function withFakeStorage(run: () => void): void {
  const store = new Map<string, string>();
  const fake = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  };
  const had = 'window' in globalThis;
  (globalThis as unknown as { window?: unknown }).window = fake;
  try {
    run();
  } finally {
    if (!had) delete (globalThis as unknown as { window?: unknown }).window;
  }
}

test('keys, contradictions, the belief and the pass all survive a reload', () => {
  withFakeStorage(() => {
    freshReader();
    grantKey('two-clicks');
    grantKey('one-press');
    setBelief('hill');
    for (const id of ACCOUNT_IDS) markEntered(id);
    flushState();

    // the reload: every cache dropped, the engine reads the disk again
    freshReader();
    const k = readKnowledge();
    assert.ok(k.keys.has('two-clicks') && k.keys.has('one-press'));
    assert.ok(k.contradictions.has('clicks'));
    assert.equal(k.belief, 'hill');
    assert.equal(k.pass, 1);
    assert.equal(k.visited.size, 12);
    assert.equal(accountState('dog', k), 'read', 'the dog was read holding one-press');
  });
});

test('a reader who reads everything, then earns a key, is told the account changed', () => {
  withFakeStorage(() => {
    freshReader();
    for (const id of ACCOUNT_IDS) markEntered(id);
    flushState();
    freshReader();
    const delta = grantKey('light-on-the-bridge');
    // every account with a block behind that key, and no other
    assert.deepEqual(
      [...delta.changed].sort(),
      [...(CONSUMERS.get('light-on-the-bridge') ?? [])].sort(),
    );
    assert.ok(delta.changed.includes('lamp'));
    flushState();
    freshReader();
    assert.equal(accountState('lamp', readKnowledge()), 'changed', 'across a reload');
  });
});
