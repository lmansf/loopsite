/**
 * tests/unit/geometry.test.ts — §C.1, the one source of truth for ring geometry.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  angleAt,
  computeGeometry,
  isOnBand,
  levelAt,
  pointAt,
  radiusOfLevel,
} from '../../src/lib/ring-geometry.ts';

test('the ring is 78% of the short axis, on every viewport', () => {
  for (const [w, h] of [
    [320, 568],
    [412, 823],
    [1440, 900],
    [900, 1440],
  ] as const) {
    const g = computeGeometry(w, h, false);
    assert.equal(g.R * 2, 0.78 * Math.min(w, h));
  }
  assert.equal(Math.round(computeGeometry(320, 568, false).R * 2), 250);
  assert.equal(Math.round(computeGeometry(1440, 900, false).R * 2), 702);
});

test('touch screens lift the ring so the caption, the arc and two notch rows fit beneath it', () => {
  const fine = computeGeometry(412, 823, false);
  const coarse = computeGeometry(412, 823, true);
  assert.equal(fine.cy, 823 * 0.5);
  assert.equal(coarse.cy, 823 * 0.42);
  assert.equal(coarse.R * 2, 0.78 * 412);
  // the two shortest phone classes give up a little diameter for that room
  const mid = computeGeometry(360, 640, true);
  assert.equal(mid.cy, 640 * 0.4);
  assert.ok(Math.abs(mid.R * 2 - 0.74 * 360) < 1e-9);
  const small = computeGeometry(320, 568, true);
  assert.equal(small.cy, 568 * 0.37);
  assert.ok(Math.abs(small.R * 2 - 0.7 * 320) < 1e-9);
  // and there is room: caption (28 + 42) + arc (14 + 44) above the top notch row
  for (const [w, h] of [[320, 568], [360, 640], [412, 915]] as const) {
    const g = computeGeometry(w, h, true);
    const arcBottom = g.cy + g.R + 84 + 44;
    const ringwayTop = h - 16 - (h < 700 ? 44 * 2 + 4 : 48 * 2 + 8) - 8;
    assert.ok(arcBottom <= ringwayTop, `${w}x${h}: arc ${arcBottom} vs ringway ${ringwayTop}`);
  }
});

test('the radius-level mapping keeps level 8 exactly on the ring', () => {
  const R = 400;
  assert.equal(radiusOfLevel(8, R), R);
  // the step is 4.2% of R per level, in both directions
  assert.ok(Math.abs(radiusOfLevel(9, R) - R * 1.042) < 1e-9);
  assert.ok(Math.abs(radiusOfLevel(7, R) - R * 0.958) < 1e-9);
  // and nothing reaches the 1.45R flick-to-remove threshold
  assert.ok(radiusOfLevel(15, R) < 1.45 * R);
});

test('the hit band is at least 28 px, so the total band clears 56 px', () => {
  assert.ok(computeGeometry(320, 568, true).band >= 28);
  assert.ok(computeGeometry(320, 568, true).R * 2 >= 200);
  assert.equal(computeGeometry(1440, 900, false).band, 0.12 * (0.78 * 900) / 2);
});

test('0 is 12 o\'clock and angles increase clockwise', () => {
  const g = computeGeometry(1000, 1000, false);
  const top = pointAt(0, 8, g);
  assert.ok(Math.abs(top.x - g.cx) < 1e-9);
  assert.ok(top.y < g.cy);

  const right = pointAt(0.25, 8, g);
  assert.ok(right.x > g.cx);
  assert.ok(Math.abs(right.y - g.cy) < 1e-9);
});

test('angleAt and pointAt are inverses', () => {
  const g = computeGeometry(1200, 800, false);
  for (let i = 0; i < 64; i++) {
    const a = i / 64;
    const p = pointAt(a, 8, g);
    assert.ok(Math.abs(angleAt(p.x, p.y, g) - a) < 1e-9, `turn ${a}`);
  }
});

test('level 8 is exactly on the ring, and levelAt inverts it', () => {
  const g = computeGeometry(1200, 800, false);
  assert.ok(Math.abs(radiusOfLevel(8, g.R) - g.R) < 1e-9);
  for (let level = 0; level <= 15; level++) {
    const p = pointAt(0.3, level, g);
    assert.equal(levelAt(p.x, p.y, g), level);
  }
});

test('the centre is outside the hit band — it is reserved for SLOW', () => {
  const g = computeGeometry(1200, 800, false);
  assert.equal(isOnBand(g.cx, g.cy, g), false);
  assert.equal(isOnBand(pointAt(0.4, 8, g).x, pointAt(0.4, 8, g).y, g), true);
});
