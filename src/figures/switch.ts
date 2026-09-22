import type { Figure } from './types';

/**
 * the switch — in a cabinet at the top of a road. The still: the cabinet,
 * the two terminals, and the lever, down. The four seconds: the lever tip
 * moves 6 px and settles back. There is only supposed to be one click.
 */
const sw: Figure = {
  draw(ctx, phase, w, h) {
    const cw = Math.min(w * 0.22, 190);
    const chh = cw * 1.45;
    const x = w * 0.5 - cw * 0.5;
    const y = h * 0.5 - chh * 0.5;
    const px = x + cw * 0.5;
    const py = y + chh * 0.66;
    const len = chh * 0.34;
    const a = -Math.PI * 0.62 + Math.sin(phase * Math.PI * 2) * 0.09;

    ctx.strokeRect(x, y, cw, chh);
    ctx.globalAlpha = 0.5;
    ctx.strokeRect(x + 8, y + 8, cw - 16, chh - 16);

    // the two terminals, and the lever between them
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.moveTo(px + 4, py - len);
    ctx.arc(px, py - len, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len);
    ctx.stroke();

    // the road it is at the top of
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(x + cw * 0.5, y + chh + 14);
    ctx.lineTo(x + cw * 0.5, y + chh + 14 + chh * 0.3);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
export default sw;
