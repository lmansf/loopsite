import type { BeliefChoice as Choice } from '@/content/schema';

/**
 * The authored choice, at the foot of `four seconds` (§C.9). **OWNED BY WP-B.**
 *
 * `Corpus.choice` is not a block, so it is always server-rendered here inside
 * a `.blk[data-needs="all-twelve"]` wrapper: the runtime sets `data-held` on
 * that wrapper at entry when twelve accounts have been entered or a belief is
 * already stored, so it materialises by exactly the same entry rule as every
 * locked block, with no shift.
 *
 * Both options are real anchors to real static routes and both work with zero
 * JavaScript; only *remembering* the choice needs JavaScript, which §H.4 E4
 * states rather than hides. The other option stays on screen and stays
 * enabled, so the choice is reversible in one tap, and each one pushes, so
 * Back reverses it too.
 *
 * **Which one is held is said twice, never by colour** (§F.4): the runtime
 * fills the pip — a shape change, from a ring to a disc — and sets
 * `aria-current` on the same anchor. The pip is an inline `<svg>` rather than
 * a styled `<span>` because the fill is runtime state and this component owns
 * no stylesheet; `aria-current` rather than `aria-pressed` because
 * `aria-pressed` is not allowed on a link and axe is right to say so.
 *
 * The wrapper is a `role="group"` labelled by the prompt, not a
 * `role="paragraph"`: it is a control, and it is the one `.blk` on the site
 * that is not a sentence.
 */
export function BeliefChoice({ choice }: { choice: Choice }) {
  return (
    <div
      className="blk choice"
      role="group"
      aria-labelledby="choice-prompt"
      data-id="choice"
      data-needs="all-twelve"
    >
      <p className="choice-prompt" id="choice-prompt">
        {choice.prompt}
      </p>
      <span className="choice-options">
        {choice.options.map((o) => (
          <a
            key={o.belief}
            className="choice-option"
            href={`/?s=four-seconds&b=${o.belief}`}
            data-belief-option={o.belief}
          >
            <svg
              className="pip"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              aria-hidden="true"
              focusable="false"
            >
              <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <span className="choice-label">{o.label}</span>
          </a>
        ))}
      </span>
    </div>
  );
}
