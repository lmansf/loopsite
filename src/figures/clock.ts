import type { Figure } from './types';

/**
 * the clock — the station wall, wound by hand on a thursday. The still: the
 * ring and its twelve marks, the hour mark longer than the rest. The four
 * seconds: NOTHING MOVES. The marks brighten in turn, once round, and
 * everything is exactly where it was — which is the clock's whole account.
 */
const clock: Figure = {
  draw(ctx, phase, w, h) {
    const r = Math.min(w * 0.26, h * 0.3, 210);
    const cx = w * 0.5;
    const cy = h * 0.5;

    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const long = i === 11;                       // eleven, and oh four
      const inner = r - (long ? 26 : 14);
      // a brightness that goes once round in four seconds, and no geometry
      const d = Math.abs(((i / 12 - phase + 1.5) % 1) - 0.5) * 2;
      ctx.globalAlpha = 0.3 + 0.7 * d * d;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4));
      ctx.stroke();
    }

    // the hands, stopped where they were stopped
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(-Math.PI / 2 + 5.76) * r * 0.5, cy + Math.sin(-Math.PI / 2 + 5.76) * r * 0.5);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(-Math.PI / 2 + 0.42) * r * 0.78, cy + Math.sin(-Math.PI / 2 + 0.42) * r * 0.78);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
export default clock;
