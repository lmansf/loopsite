/**
 * tests/unit/corpus.test.ts — the copy discipline for src/content/accounts.ts.
 *
 * The prose cannot be tested. Everything the prose has to be true *about* can.
 * This file is the contract between the writer and the twelve builders: if it
 * is green, the renderer can trust the corpus, and every bracketed word, key,
 * lock and cycle in the site resolves.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACCOUNT_IDS, allAsides, bracketedWords } from '../../src/content/schema.ts';
import type { Account, Aside, Block } from '../../src/content/schema.ts';
import { CORPUS } from '../../src/content/accounts.ts';

const accounts = CORPUS.accounts;
const asides = allAsides(CORPUS);
const asideIds = new Set(asides.map((a) => a.id));

/** words, with the square brackets taken off first. */
function words(text: string): number {
  return text.replace(/[[\]]/g, '').trim().split(/\s+/).filter(Boolean).length;
}

/** a block that is always present: no key, no belief. */
function isBase(b: Block): boolean {
  return b.needs === undefined && b.belief === undefined;
}

function accountOf(id: string): Account {
  const a = accounts.find((x) => x.id === id);
  assert.ok(a, `no account ${id}`);
  return a;
}

/** every occurrence of `word` as a whole phrase in `text`, brackets removed. */
function occurrences(text: string, word: string): number {
  const bare = text.replace(/[[\]]/g, '');
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...bare.matchAll(new RegExp(`(^|[^a-z0-9'])${escaped}([^a-z0-9']|$)`, 'g'))].length;
}

test('twelve accounts, in ACCOUNT_IDS order, cycling back to the dog', () => {
  assert.deepEqual(
    accounts.map((a) => a.id),
    [...ACCOUNT_IDS],
  );

  // one cycle through all twelve, and only one
  const seen: string[] = [];
  let at = 'dog';
  for (let i = 0; i < ACCOUNT_IDS.length; i++) {
    assert.ok(!seen.includes(at), `next() revisits ${at} before closing the cycle`);
    seen.push(at);
    at = accountOf(at).next;
  }
  assert.equal(at, 'dog', 'the cycle must return to the dog');
  assert.deepEqual([...seen].sort(), [...ACCOUNT_IDS].sort());
});

test('every account has a title, a standfirst and an onward control', () => {
  for (const a of accounts) {
    assert.ok(a.title.length > 0, `${a.id}: no title`);
    assert.ok(a.standfirst.length > 0, `${a.id}: no standfirst`);
    assert.ok(a.ask.length > 0, `${a.id}: no ask`);
    assert.ok(!a.standfirst.includes('\n'), `${a.id}: standfirst is one line`);
  }
});

test('five contradictions, each a single flat line', () => {
  assert.equal(CORPUS.contradictions.length, 5);
  assert.deepEqual(
    CORPUS.contradictions.map((c) => c.id).sort(),
    ['both', 'bridge', 'clicks', 'count', 'hill'],
  );
  for (const c of CORPUS.contradictions) {
    assert.ok(c.needs.length >= 2, `${c.id}: a contradiction needs two witnesses`);
    assert.ok(!c.line.includes('\n'), `${c.id}: one line`);
    assert.ok(c.line.length > 0, `${c.id}: empty line`);
  }
});

test('at least thirty six asides, ids unique across the whole corpus', () => {
  assert.ok(asides.length >= 36, `only ${asides.length} asides`);
  assert.equal(asideIds.size, asides.length, 'duplicate aside id');
  for (const a of accounts) {
    assert.ok(a.asides.length >= 2, `${a.id}: too few asides`);
  }
});

test('exactly one aside arrives already open, and it is the first aside of the dog', () => {
  const open = asides.filter((a) => a.open);
  assert.equal(open.length, 1, 'exactly one aside may set open');
  assert.equal(open[0], accountOf('dog').asides[0]);
});

test('every account carries five to eight base blocks', () => {
  for (const a of accounts) {
    if (a.id === 'four-seconds') continue;
    const base = a.blocks.filter(isBase);
    assert.ok(base.length >= 5 && base.length <= 8, `${a.id}: ${base.length} base blocks`);
  }
});

test('four seconds is assembled entirely from what the reader holds', () => {
  const fs = accountOf('four-seconds');
  assert.equal(fs.blankWhenLocked, true);
  assert.ok(fs.blocks.length >= 5 && fs.blocks.length <= 8, `${fs.blocks.length} blocks`);
  for (const b of fs.blocks) {
    assert.ok(b.needs, `four-seconds/${b.id} must need a key`);
  }
  for (const a of accounts) {
    if (a.id === 'four-seconds') continue;
    assert.notEqual(a.blankWhenLocked, true, `${a.id} must not blank when locked`);
  }
});

test('twelve to sixteen locked blocks are interleaved across the other eleven accounts', () => {
  const locked = accounts
    .filter((a) => a.id !== 'four-seconds')
    .flatMap((a) => a.blocks.filter((b) => b.needs));
  assert.ok(locked.length >= 12 && locked.length <= 16, `${locked.length} locked blocks`);
  // interleaved, not appended: a locked block is never the last block of its account
  for (const a of accounts) {
    if (a.id === 'four-seconds') continue;
    const last = a.blocks[a.blocks.length - 1] as Block;
    assert.ok(!last.needs, `${a.id}: a locked block must not be the last block`);
  }
});

test('the belief choice differs in exactly four accounts, and never in fact', () => {
  assert.equal(CORPUS.choice.options.length, 2);
  assert.deepEqual(
    CORPUS.choice.options.map((o) => o.belief),
    ['valley', 'hill'],
  );
  assert.deepEqual(
    CORPUS.choice.options.map((o) => o.label),
    ['it came from the valley', 'it came from the hill'],
  );
  const differing = accounts.filter((a) => a.blocks.some((b) => b.belief));
  assert.equal(differing.length, 4, 'four accounts carry the belief');
  for (const a of differing) {
    const valley = a.blocks.filter((b) => b.belief === 'valley');
    const hill = a.blocks.filter((b) => b.belief === 'hill');
    assert.equal(valley.length, hill.length, `${a.id}: belief blocks must pair`);
    assert.ok(valley.length >= 1, `${a.id}: no belief pair`);
  }
});

test('every bracketed word is exactly one aside of the same account, used once', () => {
  for (const a of accounts) {
    const byWord = new Map<string, Aside[]>();
    for (const aside of a.asides) {
      byWord.set(aside.word, [...(byWord.get(aside.word) ?? []), aside]);
    }
    for (const b of a.blocks) {
      for (const w of bracketedWords(b.text)) {
        const hits = byWord.get(w) ?? [];
        assert.equal(hits.length, 1, `${a.id}/${b.id}: [${w}] matches ${hits.length} asides`);
        assert.equal(
          [...b.text.matchAll(new RegExp(`\\[${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g'))]
            .length,
          1,
          `${a.id}/${b.id}: [${w}] is bracketed more than once`,
        );
        assert.equal(
          occurrences(b.text, w),
          1,
          `${a.id}/${b.id}: the word ${w} appears more than once in the block`,
        );
      }
    }
  }
});

test('every aside is reachable: its word is bracketed in exactly one block of its account', () => {
  for (const a of accounts) {
    for (const aside of a.asides) {
      const carriers = a.blocks.filter((b) => bracketedWords(b.text).includes(aside.word));
      assert.equal(carriers.length, 1, `${a.id}/${aside.id}: ${carriers.length} blocks carry it`);
    }
  }
});

test('every key that is needed is granted by some aside', () => {
  for (const a of accounts) {
    for (const b of a.blocks) {
      if (b.needs) assert.ok(asideIds.has(b.needs), `${a.id}/${b.id}: no aside grants ${b.needs}`);
    }
  }
  for (const c of CORPUS.contradictions) {
    for (const k of c.needs) assert.ok(asideIds.has(k), `${c.id}: no aside grants ${k}`);
  }
});

test('every key that is granted is used, and no account locks a block behind its own key', () => {
  const owner = new Map<string, string>();
  for (const a of accounts) for (const aside of a.asides) owner.set(aside.id, a.id);

  const consumed = new Set<string>();
  for (const a of accounts) {
    for (const b of a.blocks) {
      if (!b.needs) continue;
      consumed.add(b.needs);
      if (a.id === 'four-seconds') continue;
      assert.notEqual(
        owner.get(b.needs),
        a.id,
        `${a.id}/${b.id}: locked behind a key it grants itself`,
      );
    }
  }
  const beliefOf = new Map<string, string>();
  for (const a of accounts) {
    for (const b of a.blocks) {
      if (!b.belief) continue;
      for (const w of bracketedWords(b.text)) {
        const aside = a.asides.find((x) => x.word === w);
        if (aside) beliefOf.set(aside.id, b.belief);
      }
    }
  }
  for (const c of CORPUS.contradictions) {
    for (const k of c.needs) consumed.add(k);
    if (c.id === 'both') {
      // the one collectible that cannot be earned in a single visit: its two
      // keys sit in the two halves of the belief, so holding both means
      // having read the same account under both readings.
      assert.deepEqual(c.needs.map((k) => beliefOf.get(k)), ['valley', 'hill']);
      continue;
    }
    const from = new Set(c.needs.map((k) => owner.get(k)));
    assert.ok(from.size >= 2, `${c.id}: must be earned across two accounts`);
  }
  // a key nobody reads is a key that should not exist
  for (const c of CORPUS.contradictions) assert.ok(c.needs.every((k) => consumed.has(k)));
});

test('every account is readable from an empty key set, and no lock chains off another lock', () => {
  const grantedInLockedBlock = new Set<string>();
  for (const a of accounts) {
    for (const b of a.blocks) {
      if (!b.needs) continue;
      for (const w of bracketedWords(b.text)) {
        const aside = a.asides.find((x) => x.word === w);
        if (aside) grantedInLockedBlock.add(aside.id);
      }
    }
  }
  for (const a of accounts) {
    for (const b of a.blocks) {
      if (b.needs) {
        assert.ok(
          !grantedInLockedBlock.has(b.needs) || a.id === 'four-seconds',
          `${a.id}/${b.id}: needs ${b.needs}, which is itself behind a lock`,
        );
      }
    }
    if (a.id === 'four-seconds') continue;
    assert.ok(a.blocks.some(isBase), `${a.id}: nothing to read with no keys`);
  }
});

const ALLOWED = /^[a-z0-9 .,?'[\]\n]+$/;

test('no block, aside, title or line uses a character outside the allowed set', () => {
  const check = (where: string, text: string) => {
    assert.match(text, ALLOWED, `${where}: forbidden character in ${JSON.stringify(text)}`);
  };
  for (const a of accounts) {
    check(`${a.id}.title`, a.title);
    check(`${a.id}.standfirst`, a.standfirst);
    check(`${a.id}.ask`, a.ask);
    for (const b of a.blocks) check(`${a.id}/${b.id}`, b.text);
    for (const aside of a.asides) {
      check(`${a.id}/${aside.id}.word`, aside.word);
      check(`${a.id}/${aside.id}`, aside.text);
    }
  }
  for (const c of CORPUS.contradictions) check(`contradiction.${c.id}`, c.line);
  check('choice.prompt', CORPUS.choice.prompt);
  for (const o of CORPUS.choice.options) check(`choice.${o.belief}`, o.label);
});

test('nothing on the site shouts, hedges, or explains the mechanic', () => {
  const banned = [
    'tap',
    'click here',
    'read more',
    'learn more',
    'discover',
    'explore',
    'imagine',
    'journey',
    'immersive',
    'scroll',
    'perhaps',
    'maybe',
    'somehow',
    'strange',
    'sign up',
    'right now',
  ];
  const surfaces: string[] = [];
  for (const a of accounts) {
    surfaces.push(a.title, a.standfirst, a.ask);
    for (const b of a.blocks) surfaces.push(b.text);
    for (const aside of a.asides) surfaces.push(aside.text);
  }
  for (const c of CORPUS.contradictions) surfaces.push(c.line);
  surfaces.push(CORPUS.choice.prompt, ...CORPUS.choice.options.map((o) => o.label));

  for (const text of surfaces) {
    for (const word of banned) {
      assert.ok(
        !new RegExp(`(^|[^a-z])${word}([^a-z]|$)`).test(text),
        `banned word ${word} in ${JSON.stringify(text)}`,
      );
    }
    // the narrator never addresses the reader in the accounts
    assert.ok(!/(^|[^a-z])(you|your|we|our)([^a-z]|$)/.test(text), `second person in ${text}`);
  }
});

test('blocks are phone sized and asides pay for the press', () => {
  for (const a of accounts) {
    for (const b of a.blocks) {
      const n = words(b.text);
      assert.ok(n >= 30 && n <= 60, `${a.id}/${b.id}: ${n} words`);
    }
    for (const aside of a.asides) {
      const n = words(aside.text);
      assert.ok(n >= 25 && n <= 45, `${a.id}/${aside.id}: ${n} words`);
    }
  }
});

test('the sentences stay short enough to read aloud on a phone', () => {
  const surfaces: [string, string][] = [];
  for (const a of accounts) {
    for (const b of a.blocks) surfaces.push([`${a.id}/${b.id}`, b.text]);
    for (const aside of a.asides) surfaces.push([`${a.id}/${aside.id}`, aside.text]);
  }
  for (const c of CORPUS.contradictions) surfaces.push([`contradiction.${c.id}`, c.line]);
  for (const [where, text] of surfaces) {
    for (const sentence of text.split(/[.?]+\s*/).filter(Boolean)) {
      const n = words(sentence);
      assert.ok(n <= 20, `${where}: a ${n} word sentence, ${JSON.stringify(sentence)}`);
    }
  }
});

test('one simile per account at most', () => {
  for (const a of accounts) {
    let n = 0;
    for (const text of [...a.blocks.map((b) => b.text), ...a.asides.map((x) => x.text)]) {
      // "the way it does" compares a thing to itself; that is not a simile.
      n += [...text.matchAll(/(^|[^a-z])(like a |like something |the way (?:a \w+ |it )(?!does))/g)]
        .length;
    }
    assert.ok(n <= 1, `${a.id}: ${n} similes`);
  }
});

test('block ids are unique inside their account', () => {
  for (const a of accounts) {
    const ids = a.blocks.map((b) => b.id);
    assert.equal(new Set(ids).size, ids.length, `${a.id}: duplicate block id`);
  }
});
