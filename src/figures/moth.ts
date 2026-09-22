import type { Figure } from './types';

/**
 * the moth — on the cold side of a warm pane. The still: the pane, the warm
 * inside it, and the moth against the glass. The four seconds: six
 * wingbeats, and a figure of eight 8 px wide, on the OUTSIDE of the glass.
 */
const moth: Figure = {
  draw(ctx, phase, w, h) {
    const s = Math.min(w * 0.42, h * 0.46, 340);
    const x = w * 0.5 - s * 0.5;
    const y = h * 0.5 - s * 0.5;
    const a = phase * Math.PI * 2;

    ctx.strokeRect(x, y, s, s * 0.78);
    ctx.globalAlpha = 0.45;
    ctx.strokeRect(x + 10, y + 10, s - 20, s * 0.78 - 20);

    // the moth: a figure of eight, 8 px across, against the cold side
    const mx = x + s * 0.72 + Math.sin(a) * 4;
    const my = y + s * 0.3 + Math.sin(a * 2) * 4;
    const beat = 5 + Math.abs(Math.sin(a * 6)) * 3;   // six wingbeats
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx - beat, my - beat * 0.7);
    ctx.moveTo(mx, my);
    ctx.lineTo(mx + beat, my - beat * 0.7);
    ctx.moveTo(mx, my - 3);
    ctx.lineTo(mx, my + 4);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
export default moth;
