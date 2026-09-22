import type { Figure } from './types';

/**
 * four seconds — the part of the night that nobody was in.
 *
 * Four `strokeRect`s standing on a long horizontal rule, which is a row of
 * empty form fields with an underline: of the twelve this was the one that
 * looked most like an interface and least like a drawing. The four seconds are
 * four gaps now, not four boxes — the baseline is a single long line with four
 * pieces missing out of it, which is what four seconds of a night with nothing
 * in it actually is — and the eleven who were in it are eleven marks under it.
 *
 * The still: the line, the four gaps, the eleven marks. The four seconds: the
 * light goes along the four gaps, one at a time, in order, once; and then it is
 * over and the four are just four again.
 */
const four: Figure = {
  draw(ctx, phase, w, h) {
    const span = w * 1.06;
    const x0 = -w * 0.03;
    const base = h * 0.66;
    const gap = span / 13;

    // the line, with four pieces missing out of it
    const edges: number[] = [];
    for (let i = 0; i < 4; i++) {
      const a = x0 + span * (0.14 + i * 0.2);
      edges.push(a, a + gap);
    }
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    let cursor = x0;
    for (let i = 0; i < edges.length; i += 2) {
      ctx.moveTo(cursor, base);
      ctx.lineTo(edges[i] as number, base);
      cursor = edges[i + 1] as number;
    }
    ctx.moveTo(cursor, base);
    ctx.lineTo(x0 + span, base);
    ctx.stroke();

    // what is missing still has a width: the light goes along the four gaps
    for (let i = 0; i < 4; i++) {
      const d = Math.abs(((i / 4 - phase + 1.5) % 1) - 0.5) * 2;
      ctx.globalAlpha = 0.18 + 0.62 * d * d * d;
      const a = edges[i * 2] as number;
      ctx.beginPath();
      ctx.moveTo(a, base - h * 0.16);
      ctx.lineTo(a, base - 6);
      ctx.moveTo(a + gap, base - h * 0.16);
      ctx.lineTo(a + gap, base - 6);
      ctx.stroke();
    }

    // eleven marks below it, for the eleven who were in it
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    for (let i = 0; i < 11; i++) {
      const x = x0 + span * 0.06 + (span * 0.88 * i) / 10;
      ctx.moveTo(x, base + 18);
      ctx.lineTo(x, base + 18 + h * 0.06);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
export default four;
