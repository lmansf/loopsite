import type { Figure } from './types';

/**
 * the window — a front room, facing the long way.
 *
 * This was the worst of the twelve: a frame, two mullions and a cross-rail,
 * which is a grid of six boxes drawn directly behind a grid of twelve slots.
 * There is no frame in it now. What the window's account is actually about is
 * that it is a mirror until the lights fail and then it is a window — so what
 * is drawn is the light the room throws OUT: a long skewed parallelogram of it
 * lying on the ground, going away from the glass, with the sill as one line
 * above it. Nothing in it is square to the screen.
 *
 * The still: the thrown light, and the long way going away from it. The four
 * seconds: the light in it fades by a few per cent and returns. Nothing moves.
 */
const win: Figure = {
  draw(ctx, phase, w, h) {
    const sill = h * 0.4;
    const left = w * 0.16;
    const right = w * 0.68;

    // the sill: the only straight thing, and it is short
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(left - 10, sill);
    ctx.lineTo(right + 10, sill);
    ctx.stroke();

    // the light the room throws out, lying on the ground and skewed away
    const far = h * 1.04;
    const skew = w * 0.3;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(left, sill + 8);
    ctx.lineTo(left + skew * 0.6, far);
    ctx.moveTo(right, sill + 8);
    ctx.lineTo(right + skew, far);
    ctx.stroke();

    // the one pane that had something in it, as a patch of that light
    ctx.globalAlpha = 0.16 + Math.sin(phase * Math.PI * 2) * 0.05;
    ctx.beginPath();
    ctx.moveTo(left + (right - left) * 0.56, sill + 10);
    ctx.lineTo(right - 4, sill + 10);
    ctx.lineTo(right + skew * 0.72, far);
    ctx.lineTo(left + (right - left) * 0.56 + skew * 0.62, far);
    ctx.closePath();
    ctx.fill();

    // and the mullion that divides it, seen only in the light on the ground
    ctx.globalAlpha = 0.38;
    ctx.beginPath();
    ctx.moveTo(left + (right - left) * 0.34, sill + 8);
    ctx.lineTo(left + (right - left) * 0.34 + skew * 0.78, far);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
export default win;
