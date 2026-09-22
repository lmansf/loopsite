/**
 * tests/unit/rng.test.ts — determinism is a contract: the same ?seed= must
 * always produce the same visuals (§F.3).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashSeed, mulberry32 } from '../../src/lib/rng.ts';

test('hashSeed is stable, in [0,1), and sensitive to both inputs', () => {
  const a = hashSeed(1234, 'mirror');
  assert.equal(a, hashSeed(1234, 'mirror'));
  assert.ok(a >= 0 && a < 1);
  assert.notEqual(a, hashSeed(1235, 'mirror'));
  assert.notEqual(a, hashSeed(1234, 'mirrot'));
});

test('mulberry32 replays exactly from the same seed', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 200; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
});

test('different seeds diverge', () => {
  const a = mulberry32(1);
  const b = mulberry32(2);
  let same = 0;
  for (let i = 0; i < 100; i++) if (a() === b()) same++;
  assert.equal(same, 0);
});
