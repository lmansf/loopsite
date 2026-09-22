#!/usr/bin/env node
/**
 * scripts/gen-graph.mjs — regenerates src/lib/graph.ts from the corpus.
 *
 *   node --experimental-strip-types scripts/gen-graph.mjs > src/lib/graph.ts
 *
 * The corpus is frozen, so this runs once. `auditCorpus(CORPUS)` and
 * tests/unit/knowledge.test.ts fail if graph.ts and accounts.ts ever disagree.
 */

const { CORPUS } = await import(new URL('../src/content/accounts.ts', import.meta.url).href);

const lines = [];
lines.push(`/**
 * src/lib/graph.ts — GENERATED, prose-free. Do not edit by hand.
 *
 * The key graph of \`src/content/accounts.ts\` with **every word of the story
 * removed**: account ids, block ids, which key a block needs, which belief it
 * belongs to, which asides an account emits, and what each contradiction
 * needs. Nothing else.
 *
 * Why it exists (design/11-narrative-build-spec.md §E item 3, §I.8): the
 * engine runs in the browser and the story does not. \`knowledge.ts\` is the
 * engine, so it may not import the corpus — one import would put all ~5000
 * words into Tier B on top of the document that already carries them. It
 * imports this instead: ~3 KB raw, under 1 KB gz, no prose.
 *
 * It cannot drift: \`auditCorpus(CORPUS)\` compares this file against the real
 * corpus and \`tests/unit/knowledge.test.ts\` fails if they disagree.
 *
 * Regenerate (only if the frozen corpus is ever reopened):
 *   node --experimental-strip-types scripts/gen-graph.mjs > src/lib/graph.ts
 */

import type { AccountId, Belief, KeyId } from '../content/schema';

export interface GraphBlock {
  id: string;
  needs?: KeyId;
  belief?: Belief;
}

export interface GraphAccount {
  id: AccountId;
  /** every block, in authored (story) order */
  blocks: GraphBlock[];
  /** the aside ids this account emits, in authored order */
  asides: KeyId[];
  /** \`four-seconds\`: a locked block prints as a blank rule (§C.10) */
  blank?: true;
}

export interface GraphContradiction {
  id: string;
  needs: KeyId[];
}

export interface KeyGraph {
  accounts: GraphAccount[];
  contradictions: GraphContradiction[];
}

export const GRAPH: KeyGraph = {`);
lines.push('  accounts: [');
for (const a of CORPUS.accounts) {
  lines.push(`    {`);
  lines.push(`      id: '${a.id}',`);
  lines.push(`      blocks: [`);
  for (const b of a.blocks) {
    const parts = [`id: '${b.id}'`];
    if (b.needs) parts.push(`needs: '${b.needs}'`);
    if (b.belief) parts.push(`belief: '${b.belief}'`);
    lines.push(`        { ${parts.join(', ')} },`);
  }
  lines.push(`      ],`);
  lines.push(`      asides: [${a.asides.map((x) => `'${x.id}'`).join(', ')}],`);
  if (a.blankWhenLocked) lines.push(`      blank: true,`);
  lines.push(`    },`);
}
lines.push('  ],');
lines.push('  contradictions: [');
for (const c of CORPUS.contradictions) {
  lines.push(`    { id: '${c.id}', needs: [${c.needs.map((k) => `'${k}'`).join(', ')}] },`);
}
lines.push('  ],');
lines.push('};');
lines.push('');
lines.push('export default GRAPH;');
lines.push('');
console.log(lines.join('\n'));
