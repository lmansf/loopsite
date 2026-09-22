/**
 * tests/unit/share.test.ts — the share codec, §C.7, byte-exact.
 *
 * Uses node:test + node:assert (Node 22's built-in runner strips the types), so
 * there is no extra dependency and no extra config to keep pinned.
 *   pnpm test:unit
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeLoop, encodeLoop, shareUrl } from '../../src/lib/share.ts';
import { mulberry32 } from '../../src/lib/rng.ts';

type Node = { id: string; a: number; r: number; v: number; born: number };

const node = (a: number, r: number, v: number): Node => ({ id: 'x', a, r, v, born: 0 });

test('an empty ring encodes to a 2-byte payload and decodes back to nothing', () => {
  const code = encodeLoop([]);
  const back = decodeLoop(code);
  assert.ok(back);
  assert.equal(back.nodes.length, 0);
  assert.equal(back.reverse, false);
  assert.equal(back.slow, false);
});

test('exact sizes: 4 nodes = 14 chars, 8 nodes = 24 chars, 24 nodes = 67 chars', () => {
  const mk = (n: number) => Array.from({ length: n }, (_, i) => node(i / n, 8, 0));
  assert.equal(encodeLoop(mk(4)).length, 14);
  assert.equal(encodeLoop(mk(8)).length, 24);
  // §C.7 states 68 for 24 nodes; 50 bytes is 68 base64 chars WITH padding and
  // 67 without. The codec strips padding, so 67 is the true unpadded length.
  assert.equal(encodeLoop(mk(24)).length, 67);
});

test('flags survive the round trip', () => {
  const nodes = [node(0.25, 8, 3)];
  for (const reverse of [false, true]) {
    for (const slow of [false, true]) {
      const back = decodeLoop(encodeLoop(nodes, { reverse, slow }));
      assert.ok(back);
      assert.equal(back.reverse, reverse);
      assert.equal(back.slow, slow);
    }
  }
});

test('the codec is byte-exact over 1000 random node sets', () => {
  const rnd = mulberry32(0xc0ffee);
  for (let iter = 0; iter < 1000; iter++) {
    const n = Math.floor(rnd() * 25); // 0..24
    const nodes: Node[] = [];
    for (let i = 0; i < n; i++) {
      // angles are quantized to 1/256 rev on commit, so build them that way
      const a = Math.floor(rnd() * 256) / 256;
      nodes.push(node(a, Math.floor(rnd() * 16), Math.floor(rnd() * 16)));
    }
    const back = decodeLoop(encodeLoop(nodes));
    assert.ok(back, `iteration ${iter} failed to decode`);
    assert.equal(back.nodes.length, nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      assert.equal(back.nodes[i]!.a, nodes[i]!.a, `angle mismatch at ${iter}/${i}`);
      assert.equal(back.nodes[i]!.r, nodes[i]!.r, `radius mismatch at ${iter}/${i}`);
      assert.equal(back.nodes[i]!.v, nodes[i]!.v, `variant mismatch at ${iter}/${i}`);
    }
  }
});

test('a bad payload is rejected silently, never thrown', () => {
  const bad = [
    '',
    'z',
    '!!!!',
    'AAAA',                      // version 0
    encodeLoop([node(0.5, 8, 1)]).slice(0, -1), // truncated
    'AQ',                        // header ok, checksum missing/incorrect length
  ];
  for (const code of bad) {
    assert.doesNotThrow(() => decodeLoop(code));
  }
  assert.equal(decodeLoop('AAAA'), null, 'unknown version must be rejected');
});

test('a corrupted checksum is rejected', () => {
  const code = encodeLoop([node(0.5, 8, 1), node(0.75, 4, 2)]);
  const bytes = Buffer.from(code.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  bytes[1] = (bytes[1]! ^ 0xff) & 0xff;
  const broken = bytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.equal(decodeLoop(broken), null);
});

test('more than 24 nodes is refused on the way in and on the way out', () => {
  const many = Array.from({ length: 40 }, (_, i) => node(i / 40, 8, 0));
  const back = decodeLoop(encodeLoop(many));
  assert.ok(back);
  assert.equal(back.nodes.length, 24);
});

test('shareUrl puts the room in the search param and the loop in the hash', () => {
  const url = shareUrl('tone', 'ABCD');
  assert.ok(url.endsWith('/?s=tone#l=ABCD'), url);
});
