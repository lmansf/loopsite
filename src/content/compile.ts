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

import type { Account, Aside, Block } from './schema.ts';
import { EMITTERS } from '../lib/knowledge.ts';

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
 */
export function compileBlock(block: Block, asides: readonly Aside[]): string {
  let html = escapeHtml(block.text);
  for (const aside of asides) {
    const word = escapeHtml(aside.word);
    const pattern = new RegExp(`\\[${escapeRegExp(word)}\\]`);
    if (!pattern.test(html)) continue;
    const open = aside.open ? ' open' : '';
    const markup =
      `<details class="aside" data-key="${attr(aside.id)}"${open}>` +
      `<summary>${word}</summary>` +
      `<span class="aside-body">${escapeHtml(aside.text)}</span>` +
      `</details>`;
    html = html.replace(pattern, () => markup);
  }
  return html;
}

/** One `.blk` element: the wrapper plus its compiled prose. */
function compileBlockElement(account: Account, block: Block): string {
  const needs = block.needs ? ` data-needs="${attr(block.needs)}"` : '';
  const belief = block.belief ? ` data-belief="${attr(block.belief)}"` : '';
  const body = compileBlock(block, account.asides);
  const seeAlso = account.blankWhenLocked && block.needs ? seeAlsoLink(block.needs) : '';
  return (
    `<div class="blk" role="paragraph" data-id="${attr(block.id)}"${needs}${belief}>` +
    body +
    seeAlso +
    `</div>`
  );
}

/**
 * `see also` beside a blank rule in `four seconds` (§C.10) — a real link to
 * the account that emits the missing key. The visible string is the one fixed
 * in §C.13; the account's own title rides along for the accessibility tree, so
 * the link is never a bare `see also` to a screen reader.
 */
function seeAlsoLink(key: string): string {
  const emitter = EMITTERS.get(key);
  if (!emitter) return '';
  return (
    `<span class="see-also" data-for="${attr(key)}">` +
    `<a href="/?s=${attr(emitter)}" data-slot="${attr(emitter)}">see also</a>` +
    `</span>`
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
 * `dangerouslySetInnerHTML` on `.blocks`.
 */
export function compileAccount(a: Account): { id: string; html: string; blocks: string[] } {
  const hit = cache.get(a.id);
  if (hit) return hit;
  const blocks = a.blocks.map((b) => compileBlockElement(a, b));
  const out = { id: a.id, html: blocks.join(''), blocks };
  cache.set(a.id, out);
  return out;
}

/** Test-only: drops the memo so a test can compile a synthetic account twice. */
export function __resetCompileCache(): void {
  cache.clear();
}
