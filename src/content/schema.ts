/**
 * src/content/schema.ts — THE CONTENT CONTRACT.
 *
 * Concept: design/10-narrative-concept.md ("the same four seconds").
 *
 * The site is twelve accounts of one four-second power cut. Every word the
 * visitor reads lives in `src/content/accounts.ts` as data shaped by this file.
 * The renderer knows nothing about the story; the story knows nothing about
 * React. That separation is what keeps one voice across twelve accounts.
 *
 * FROZEN once the writer and the builders start. A change here costs both.
 */

/** The twelve accounts, in nav order. `four-seconds` is always last. */
export const ACCOUNT_IDS = [
  'dog',
  'lamp',
  'kettle',
  'moth',
  'river',
  'bus',
  'radio',
  'clock',
  'window',
  'switch',
  'road',
  'four-seconds',
] as const;

export type AccountId = (typeof ACCOUNT_IDS)[number];

/**
 * A key is granted by opening one aside, and is the only currency in the site.
 * Ids are lowercase words joined by hyphens and read as facts, not UI:
 * `two-clicks`, `light-on-the-bridge`, `six-seconds`.
 */
export type KeyId = string;

/** What the visitor came to believe. One authored choice, two options. */
export type Belief = 'valley' | 'hill';

/**
 * A pressable word inside a block.
 *
 * `word` must appear in its block's text wrapped in square brackets, exactly
 * once, character for character: `the dog heard [the second click].`
 * Opening it grants `id` as a key, permanently.
 */
export interface Aside {
  id: KeyId;
  word: string;
  text: string;
  /**
   * Rendered already open on arrival. Exactly ONE aside in the whole site sets
   * this (the first aside of `dog`), and it is how the mechanic is taught
   * without a word of instruction.
   */
  open?: true;
}

/** One paragraph of an account. */
export interface Block {
  id: string;
  /** Prose. Pressable words are wrapped in [square brackets]. */
  text: string;
  /**
   * Locked until the visitor holds this key. A locked block is INTERLEAVED at
   * its position, not appended: the same lines come back with a new one
   * between them, and the old lines mean something else.
   *
   * Locked blocks materialise only when an account is ENTERED, never while it
   * is being read — that rule is what keeps CLS at 0.
   */
  needs?: KeyId;
  /** Shown only under this belief. Absent means: always shown. */
  belief?: Belief;
}

/** An account: one witness, one page, one voice. */
export interface Account {
  id: AccountId;
  /** The nav label and the heading. Lowercase, with its article: `the dog`. */
  title: string;
  /** One line under the heading. Never a summary of what follows. */
  standfirst: string;
  /** The fixed control that carries you on: `ask the streetlight`. */
  ask: string;
  next: AccountId;
  blocks: Block[];
  asides: Aside[];
  /**
   * `four-seconds` only: a locked block renders as a rule of its own character
   * width instead of vanishing, so the visitor sees the shape of what they do
   * not yet hold.
   */
  blankWhenLocked?: true;
}

/**
 * The five contradictions. Earned by holding every key in `needs`, which means
 * they can only be earned across accounts — and `both` only across two visits.
 * Counted `n/5` in the nav hub.
 */
export interface Contradiction {
  id: string;
  needs: KeyId[];
  /** One line, stated flatly. The site never tells you which witness is wrong. */
  line: string;
}

/** The authored choice. Two options, real consequences in four accounts. */
export interface BeliefChoice {
  /** The question, in the narrator's voice. */
  prompt: string;
  options: { belief: Belief; label: string }[];
}

export interface Corpus {
  accounts: Account[];
  contradictions: Contradiction[];
  choice: BeliefChoice;
}

/**
 * Every aside in the site, in a STABLE order: account order, then the order the
 * asides appear within the account. The index in this list is the aside's bit
 * in the shared-link bitfield, so the order may never be rearranged once the
 * corpus ships — only appended to.
 */
export function allAsides(corpus: Corpus): Aside[] {
  const out: Aside[] = [];
  for (const id of ACCOUNT_IDS) {
    const account = corpus.accounts.find((a) => a.id === id);
    if (account) out.push(...account.asides);
  }
  return out;
}

/** The bracketed words in a block, in order. */
export function bracketedWords(text: string): string[] {
  return [...text.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1] as string);
}
