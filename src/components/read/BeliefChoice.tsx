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
 * Both options are real anchors and both work with zero JavaScript; only
 * remembering the choice needs JavaScript, which §H.4 E4 states rather than
 * hides. The other option stays on screen and stays enabled, so the choice is
 * reversible in one tap and Back reverses it too.
 */
export function BeliefChoice({ choice }: { choice: Choice }) {
  return (
    <div className="blk choice" role="paragraph" data-id="choice" data-needs="all-twelve">
      <p className="choice-prompt">{choice.prompt}</p>
      <span className="choice-options">
        {choice.options.map((o) => (
          <a
            key={o.belief}
            className="choice-option"
            href={`/?s=four-seconds&b=${o.belief}`}
            data-belief-option={o.belief}
          >
            <span className="pip" aria-hidden="true" />
            <span className="choice-label">{o.label}</span>
          </a>
        ))}
      </span>
    </div>
  );
}
