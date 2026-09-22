import type { Figure } from './types';

/**
 * the window — a front room, facing the long way. The still: six panes, and
 * the one that has something in it. The four seconds: the lit pane fades by
 * a few per cent and returns. The frame never moves.
 */
const win: Figure = {
  draw(ctx, phase, w, h) {
    const fw = Math.min(w * 0.44, 360);
    const fh = fw * 0.82;
    const x = w * 0.5 - fw * 0.5;
    const y = h * 0.5 - fh * 0.5;
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

    // the pane with something in it, seen the long way
    ctx.globalAlpha = 0.5 + Math.sin(phase * Math.PI * 2) * 0.18;
    ctx.fillRect(x + cw * 2 + 3, y + 3, cw - 6, ch - 6);

    // the long way, going away from the glass
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(x + fw * 0.3, y + fh + 18);
    ctx.lineTo(x + fw * 0.46, y + fh + 18 + fh * 0.3);
    ctx.moveTo(x + fw * 0.7, y + fh + 18);
    ctx.lineTo(x + fw * 0.54, y + fh + 18 + fh * 0.3);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
export default win;
