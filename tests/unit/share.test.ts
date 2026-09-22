/**
 * tests/unit/share.test.ts — the codec. **OWNED BY WP-D.** Spec: §H.2.
 *
 * WP-D's acceptance is 10 000 random states round-tripping exactly, every
 * boundary, a 15-character code at the shipped 43 asides, every
 * single-character mutation either round-tripping or returning null, a
 * truncated aside field zero-extended and an over-long one rejected.
 *
 * `encodeState` / `decodeState` are not written yet (see src/lib/share.ts).
 * What WP-N left is the one property that must hold from the first line of
 * that work to the last: the codec never throws and never reports an error.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ASIDES, CODEC_VERSION, decodeState, shareUrl } from '../../src/lib/share.ts';

test('the payload length is computed from the corpus, not assumed', () => {
  const A = Math.ceil(ASIDES.length / 8);
  assert.equal(CODEC_VERSION, 1);
  assert.equal(A, 6, 'the shipped corpus has 43 asides');
  assert.equal(5 + A, 11, 'L = 5 + A bytes, which is 15 base64url characters');
});

test('decoding never throws, whatever it is handed', () => {
  const hostile = ['', '!', '=', 'A', '////', 'a'.repeat(4096), '-_-_-_-_', 'AAAAAAAAAAA'];
  for (const code of hostile) {
    assert.doesNotThrow(() => decodeState(code), `decodeState(${JSON.stringify(code)}) threw`);
    assert.equal(decodeState(code), null);
  }
});

test('a share url is the canonical route with the code in the hash', () => {
  assert.equal(shareUrl('road', 'ABCDEFGHIJKLMNO'), '/?s=road#n=ABCDEFGHIJKLMNO');
});
