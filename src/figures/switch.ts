import type { Figure } from './types';

/**
 * the switch — in a cabinet at the top of a road.
 *
 * Two concentric `strokeRect`s, which is a box inside a box: the shape the
 * bounce audit describes as chrome. The cabinet is down to what you see of one
 * at night — a hinge side, the lip of an open door, and the dark inside it —
 * and the lever, the two terminals and the road are what the account is for.
 *
 * The still: the two terminals and the lever, down. The four seconds: the
 * lever tip moves 6 px and settles back. There is only supposed to be one
 * click.
 */
const sw: Figure = {
  draw(ctx, phase, w, h) {
    const cw = Math.min(w * 0.34, 260);
    const chh = cw * 1.25;
    const x = w * 0.5 - cw * 0.5;
    const y = h * 0.84 - chh;
    const px = x + cw * 0.46;
    const py = y + chh * 0.66;
    const len = chh * 0.3;
    const a = -Math.PI * 0.62 + Math.sin(phase * Math.PI * 2) * 0.09;

    // the hinge side, and the lip of a door that is standing open
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y + chh * 0.06);
    ctx.lineTo(x, y + chh * 0.94);
    ctx.moveTo(x, y + chh * 0.06);
    ctx.quadraticCurveTo(x - cw * 0.22, y + chh * 0.5, x - cw * 0.06, y + chh * 0.94);
    ctx.stroke();

    // the two terminals, and the lever between them
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.moveTo(px + 5, py - len);
    ctx.arc(px, py - len, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len);
    ctx.stroke();

    // the road it is at the top of, going down and away
    ctx.globalAlpha = 0.32;
    ctx.beginPath();
    ctx.moveTo(x + cw * 0.3, y + chh + 16);
    ctx.quadraticCurveTo(x + cw * 0.1, h * 0.96, x - cw * 0.3, h * 1.06);
    ctx.moveTo(x + cw * 0.9, y + chh + 16);
    ctx.quadraticCurveTo(x + cw * 1.0, h * 0.96, x + cw * 1.3, h * 1.06);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
export default sw;
