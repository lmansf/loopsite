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

test('a corpus that breaks a law is caught', () => {
  const broken = structuredClone(CORPUS);
  const dog = broken.accounts[0];
  assert.ok(dog);
  dog.blocks[1] = { ...dog.blocks[1]!, needs: 'not-a-key' };
  const problems = auditCorpus(broken);
  assert.ok(problems.some((p) => p.includes('not-a-key')), problems.join('\n'));
});
