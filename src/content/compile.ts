/**
 * src/content/compile.ts — Block -> HTML string. **Server only.**
 *
 * Spec: design/11-narrative-build-spec.md §C.1, §C.2, §C.10, §D.2, §E.
 * Written by WP-N; **owned by WP-A thereafter.**
 *
 * The prose is compiled to an HTML string on the server and injected with
 * `dangerouslySetInnerHTML`. Two reasons, both load-bearing (§E item 2):
 *
 *  1. React's inline flight payload then carries twelve strings instead of a
 *     tree of several thousand element descriptors. The tree form roughly
 *     doubles the document; the string form costs the text plus about 8 %.
 *  2. The prose is never hydrated, never re-rendered and never owned by React
 *     at all, so the first `<summary>` press works in the first painted frame.
 *
 * ## Escaping
 *
 * Every string that comes out of the corpus is escaped for `& < > "` BEFORE a
 * single character of markup is substituted into it, and the bracket
 * substitution then runs over already-escaped text. `tests/unit/compile.test.ts`
 * feeds it hostile strings. Nothing here ever interpolates an unescaped value.
 *
 * ## A block is a `<div role="paragraph">`, not a `<p>` (§I.6)
 *
 * `<details>` is flow content and is not legal inside `<p>`; a malformed `<p>`
 * is repaired by the parser into a shape that breaks the inline aside.
 * `role="paragraph"` restores the semantics for assistive technology at zero
 * byte cost.
 */

import type { Account, AccountId, Aside, Block, Contradiction } from './schema.ts';
import { EMITTERS } from '../lib/knowledge.ts';
import { CORPUS } from './accounts.ts';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

/** Escape `& < > "`. Every corpus string goes through this first. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ESCAPES[c] as string);
}

/** An attribute value: escaped, and with anything exotic stripped from ids. */
function attr(value: string): string {
  return escapeHtml(value);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The prose of one block, with every `[bracketed word]` replaced by its
 * inline `<details>` (§C.2). Returns the block's INNER html — the caller
 * wraps it in `.blk`.
 *
 * The single aside in the corpus carrying `open: true` is emitted with the
 * `open` attribute already set, which is how the mechanic is taught in zero
 * words of instruction before a byte of JavaScript has run.
 *
 * A bracketed word with no matching aside keeps its brackets rather than
 * silently vanishing: `tests/unit/corpus.test.ts` already makes that
 * impossible, and a visible bracket in a preview is better than a lost word.
 *
 * ## The aside body is emitted at the FOOT of the block, not inside the word
 *
 * §C.2 put the body inside the `<details>` and let the block-level box
 * fragment the inline it sits in. It works, and it reads as a fault: the
 * opening block of `dog` came out as
 *
 *     …the dark came in one
 *     ⟦ the aside ⟧
 *     piece, like a held breath.
 *
 * — the sentence severed between `one` and `piece`, on the first screen the
 * whole site is priced on (`13` §2.1). Nothing in CSS can move a box out of
 * the inline it is written in: in flow it is a block, a float or an inline,
 * and all three cut the line. So the COMPILER moves it. The `<details>` keeps
 * the word, exactly where the writer put it, and carries nothing else; the
 * body is emitted as its sibling after the last sentence of the block, and
 * `read.css` pairs the two by `data-i` with a plain `~` — no `:has()`, no
 * `::details-content`, no JavaScript, and no browser older than the sibling
 * combinator can get it wrong.
 *
 * The summary carries no `aria-details` to the body it no longer holds: the
 * note is read where it stands, at the end of the paragraph the word is in,
 * which is the same order the eye gets it in, and the pair of attributes cost
 * 0.4 KB of an 18 KB flight budget for an announcement two screen readers of
 * four would make.
 *
 * What the reader gets: the paragraph is never interrupted, the note arrives
 * under the paragraph the word is in, and the words BELOW an open aside are
 * no longer pushed down the page by it — which is what puts a second,
 * unpressed word in the first viewport (`13` §5.6).
 *
 * The note names its word. That is the tie, it is the only thing that can be
 * the tie once the body is not inside the word, and it costs no new copy:
 * `Aside.word` is the corpus's own string. It also reads the way a gloss has
 * always read, and it tells a screen-reader user which word the note answers.
 */
export function compileBlock(block: Block, asides: readonly Aside[]): string {
  let html = escapeHtml(block.text);
  // positions are taken BEFORE any substitution, so `data-i` runs in reading
  // order however the asides happen to be ordered in the corpus
  const found = asides
    .map((aside) => ({ aside, at: html.indexOf(`[${escapeHtml(aside.word)}]`) }))
    .filter((hit) => hit.at >= 0)
    .sort((a, b) => a.at - b.at);

  const bodies: string[] = [];
  found.forEach(({ aside }, i) => {
    const word = escapeHtml(aside.word);
    const pattern = new RegExp(`\\[${escapeRegExp(word)}\\]`);
    const open = aside.open ? ' open' : '';
    html = html.replace(
      pattern,
      () =>
        `<details class="aside" data-key="${attr(aside.id)}" data-i="${i}"${open}>` +
        `<summary>${word}</summary>` +
        `</details>`,
    );
    bodies.push(
      `<span class="aside-body" data-i="${i}">` +
        `<span class="aside-word">${word}</span>` +
        escapeHtml(aside.text) +
        `</span>`,
    );
  });
  return html + bodies.join('');
}

/** One `.blk` element: the wrapper plus its compiled prose. */
function compileBlockElement(account: Account, block: Block): string {
  const needs = block.needs ? ` data-needs="${attr(block.needs)}"` : '';
  const belief = block.belief ? ` data-belief="${attr(block.belief)}"` : '';
  const body = compileBlock(block, account.asides);
  const blank = account.blankWhenLocked === true && block.needs !== undefined;
  return (
    `<div class="blk" role="paragraph" data-id="${attr(block.id)}"${needs}${belief}>` +
    (blank ? `<span class="rule"><span class="hush">${body}</span></span>` : body) +
    (blank ? seeAlsoLink(block.needs as string) : '') +
    `</div>`
  );
}

/** account id -> the account's own title, for the `see also` links. */
const TITLES: ReadonlyMap<string, string> = new Map(
  CORPUS.accounts.map((a) => [a.id as string, a.title]),
);

/**
 * `see also`, and the account that holds the missing key, beside a blank rule
 * in `four seconds` (§C.10). A real link, with the account's own title as its
 * text, so its accessible name is `the switch` and never a bare `see also`
 * repeated seven times. Both strings are lawful: `see also` is the §C.13 entry
 * the concept fixes for exactly this place, and the title is the corpus's.
 *
 * This is the answer to the empty-handed reader. A reader who arrives at
 * `four seconds` holding nothing gets the heading, the standfirst, seven
 * blanks in the shape of the sentences they did not ask for, and seven ways
 * back into the accounts that hold them — naming six of the twelve. The
 * ending is an index of what is missing, which is the strongest open loop the
 * site can draw, and it is drawn without one invented word.
 */
function seeAlsoLink(key: string): string {
  const emitter = EMITTERS.get(key) as AccountId | undefined;
  const title = emitter ? TITLES.get(emitter) : undefined;
  if (!emitter || !title) return '';
  return (
    `<span class="see-also" data-for="${attr(key)}">see also ` +
    `<a href="/?s=${attr(emitter)}" data-slot="${attr(emitter)}">${escapeHtml(title)}</a>` +
    `</span>`
  );
}

/* ------------------------------------------------- the five contradictions */

/**
 * Which account says a contradiction's line, and why that account.
 *
 * A contradiction is earned across two accounts and belongs to neither
 * witness — it is the one place the narrator speaks. `Contradiction.needs` is
 * written in the same order as the line names its witnesses (`the dog heard
 * two clicks. the switch was pressed once.` needs `two-clicks`, then
 * `one-press`), so the line goes home to **the account it names first**:
 * `clicks` to `dog`, `bridge` to `river`, `count` to `moth`, `hill` to
 * `window`, `both` to `lamp`, which emits both halves of it. No table, no
 * ruling — the corpus's own ordering decides, and `tests/unit/compile.test.ts`
 * holds it to that.
 *
 * That is also the witness the reader met FIRST — every pair runs earlier
 * account to later one in nav order — so the line waits in a page they have
 * already read and will pass again, and finding it is a re-reading, not a
 * notification. `13` §5.3 suggested the later account; the earlier one is
 * where the ring actually carries the reader back to.
 */
export const CONTRADICTION_HOME: ReadonlyMap<string, AccountId> = new Map(
  CORPUS.contradictions.flatMap((c) => {
    const home = EMITTERS.get(c.needs[0] as string);
    return home ? [[c.id, home] as const] : [];
  }),
);

/**
 * One contradiction, as an ordinary locked block at the foot of its account's
 * prose (§C.5 `contra:<id>`, §C.6).
 *
 * It needs no new mechanism: `effectiveKeys()` already computes `contra:<id>`
 * the moment both halves are held, and the runtime already materialises
 * `.blk[data-needs]` at entry, with the permanent hairline rule that marks
 * new material and the one-entry `data-new` fade. Which means the line
 * obeys the materialisation rule like everything else — it is never inserted
 * while the reader is looking at the page, and it costs no layout shift.
 *
 * It is last in the account because the line is not the witness's voice and
 * may not interrupt it, and because the last thing before the ask card is the
 * one paragraph every reader who finishes an account passes through.
 */
function compileContradiction(c: Contradiction): string {
  return (
    `<div class="blk contra" role="paragraph" data-id="contra-${attr(c.id)}"` +
    ` data-needs="contra:${attr(c.id)}">${escapeHtml(c.line)}</div>`
  );
}

const cache = new Map<string, { id: string; html: string; blocks: string[] }>();

/**
 * Every block of one account, compiled. Memoised at module scope: the twelve
 * accounts are compiled once per server process and the strings are reused on
 * every render.
 *
 * `blocks[i]` is the complete `.blk` element for `account.blocks[i]`, in
 * authored (story) order — locked blocks INTERLEAVED at their written
 * position, never appended. `html` is the concatenation, ready for
 * `dangerouslySetInnerHTML` on `.blocks`, followed by any contradiction line
 * this account is home to.
 */
export function compileAccount(a: Account): { id: string; html: string; blocks: string[] } {
  const hit = cache.get(a.id);
  if (hit) return hit;
  const blocks = a.blocks.map((b) => compileBlockElement(a, b));
  const lines = CORPUS.contradictions
    .filter((c) => CONTRADICTION_HOME.get(c.id) === a.id)
    .map(compileContradiction);
  const out = { id: a.id, html: blocks.join('') + lines.join(''), blocks };
  cache.set(a.id, out);
  return out;
}

/** Test-only: drops the memo so a test can compile a synthetic account twice. */
export function __resetCompileCache(): void {
  cache.clear();
}
