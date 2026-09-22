import type { Figure } from './types';

/**
 * the dog — a back door standing open a hand's width, and a step.
 * The still: the doorway, the gap, the step. The four seconds: the gap
 * breathes by 4 px, the width of a held breath, and comes back to itself.
 */
const dog: Figure = {
  draw(ctx, phase, w, h) {
    const dh = Math.min(h * 0.54, 420);
    const dw = dh * 0.42;
    const x = w * 0.5 - dw * 0.5;
    const y = h * 0.5 - dh * 0.42;
    const gap = 6 + Math.sin(phase * Math.PI * 2) * 2;

    // the frame
    ctx.strokeRect(x, y, dw, dh);
    // the door, open a hand's width, hinged left
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + gap, y + 4);
    ctx.lineTo(x + dw - 2, y + 10);
    ctx.lineTo(x + dw - 2, y + dh - 10);
    ctx.lineTo(x + gap, y + dh - 4);
    ctx.stroke();
    // what comes through it
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(x + 1, y + dh * 0.1);
    ctx.lineTo(x + 1, y + dh * 0.9);
    ctx.stroke();
    // the step, and the road that only goes one place
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(x - dw * 0.55, y + dh);
    ctx.lineTo(x + dw * 1.55, y + dh);
    ctx.moveTo(x + dw * 0.5, y + dh + 10);
    ctx.lineTo(x + dw * 0.5, y + dh + 10 + dh * 0.16);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
export default dog;
