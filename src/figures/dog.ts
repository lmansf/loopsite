import type { Figure } from './types';

/**
 * the dog — a back door standing open a hand's width, and the step.
 *
 * It used to draw the doorway as a `strokeRect`, and on a phone that rectangle
 * landed exactly over the twelve-slot night, so the account the whole site
 * opens on greeted the reader with what looked like a border round the
 * navigation. There is no frame here now. What is left is the two things the
 * dog actually reports: the leaning edge of a door that is not shut, and the
 * wedge of colder dark coming in over the step. A leaning line and a widening
 * wedge cannot be mistaken for chrome at any width.
 *
 * The still: the edge, the wedge, the step. The four seconds: the gap breathes
 * by the width of a held breath and comes back to itself.
 */
const dog: Figure = {
  draw(ctx, phase, w, h) {
    const base = h * 0.86;
    const top = h * 0.24;
    const x = w * 0.44;
    const gap = 26 + Math.sin(phase * Math.PI * 2) * 4;

    // the step: a long, shallow, slightly fallen line — never a rule
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(-w * 0.06, base - 6);
    ctx.quadraticCurveTo(w * 0.5, base + 5, w * 1.06, base - 2);
    ctx.stroke();

    /* The leading edge of the door, swung out on its hinge. It LEANS, and it
       leans hard — a door open a hand's width at the floor is open more than
       that at head height, and a line that is almost but not quite vertical is
       the thing a reader reads as a stray rule rather than as a drawing. */
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(x + gap * 0.3, top);
    ctx.quadraticCurveTo(x + gap * 1.6, (top + base) * 0.55, x + gap * 2.6, base - 10);
    ctx.stroke();

    // the jamb it is not touching: only as far down as the dog can see it
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(x, top + (base - top) * 0.3);
    ctx.lineTo(x, base - 22);
    ctx.stroke();

    // what comes through: a wedge, widening on to the floor
    ctx.globalAlpha = 0.32;
    ctx.beginPath();
    ctx.moveTo(x + 2, base - 12);
    ctx.lineTo(x - w * 0.3, h * 1.06);
    ctx.moveTo(x + gap * 2.6, base - 10);
    ctx.lineTo(x + gap * 2.6 + w * 0.26, h * 1.06);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
export default dog;
