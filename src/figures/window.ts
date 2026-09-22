import type { Figure } from './types';

/**
 * the window — a front room, facing the long way. The still: six panes, and
 * the one that has something in it. The four seconds: the lit pane fades by
 * a few per cent and returns. The frame never moves.
 */
const win: Figure = {
  draw(ctx, phase, w, h) {
    const fw = Math.min(w * 0.46, 400);
    const fh = fw * 0.8;
    const x = w * 0.5 - fw * 0.5;
    const y = h * 0.44 - fh * 0.5;
    const cw = fw / 3;
    const ch = fh / 2;

    ctx.strokeRect(x, y, fw, fh);
    ctx.globalAlpha = 0.6;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + cw * i, y);
      ctx.lineTo(x + cw * i, y + fh);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x, y + ch);
    ctx.lineTo(x + fw, y + ch);
    ctx.stroke();

    // The pane with something in it. A fill, not a stroke, so it is kept to a
    // fifth: a solid patch behind a line of prose is the one thing the
    // ambient layer is not allowed to be.
    ctx.globalAlpha = 0.2 + Math.sin(phase * Math.PI * 2) * 0.07;
    ctx.fillRect(x + cw * 2 + 4, y + 4, cw - 8, ch - 8);

    // the long way, going away from the glass
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + fw * 0.26, y + fh + 26);
    ctx.lineTo(x + fw * 0.46, y + fh + 26 + fh * 0.42);
    ctx.moveTo(x + fw * 0.74, y + fh + 26);
    ctx.lineTo(x + fw * 0.54, y + fh + 26 + fh * 0.42);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
export default win;
