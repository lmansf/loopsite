/**
 * src/lib/graph.ts — GENERATED, prose-free. Do not edit by hand.
 *
 * The key graph of `src/content/accounts.ts` with **every word of the story
 * removed**: account ids, block ids, which key a block needs, which belief it
 * belongs to, which asides an account emits, and what each contradiction
 * needs. Nothing else.
 *
 * Why it exists (design/11-narrative-build-spec.md §E item 3, §I.8): the
 * engine runs in the browser and the story does not. `knowledge.ts` is the
 * engine, so it may not import the corpus — one import would put all ~5000
 * words into Tier B on top of the document that already carries them. It
 * imports this instead: ~3 KB raw, under 1 KB gz, no prose.
 *
 * It cannot drift: `auditCorpus(CORPUS)` compares this file against the real
 * corpus and `tests/unit/knowledge.test.ts` fails if they disagree.
 *
 * Regenerate (only if the frozen corpus is ever reopened):
 *   node --experimental-strip-types scripts/gen-graph.mjs > src/lib/graph.ts
 */

import type { AccountId, Belief, KeyId } from '../content/schema.ts';

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
  /** `four-seconds`: a locked block prints as a blank rule (§C.10) */
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

export const GRAPH: KeyGraph = {
  accounts: [
    {
      id: 'dog',
      blocks: [
        { id: 'dog-1' },
        { id: 'dog-outside', needs: 'one-press' },
        { id: 'dog-2' },
        { id: 'dog-3' },
        { id: 'dog-4' },
        { id: 'dog-5' },
      ],
      asides: ['the-hour-has-a-smell', 'two-clicks', 'door-open', 'road-goes-one-place', 'wet-wool'],
    },
    {
      id: 'lamp',
      blocks: [
        { id: 'lamp-1' },
        { id: 'lamp-2' },
        { id: 'lamp-clicks', needs: 'two-clicks' },
        { id: 'lamp-3' },
        { id: 'lamp-4' },
        { id: 'lamp-bridge', needs: 'light-on-the-bridge' },
        { id: 'lamp-valley', belief: 'valley' },
        { id: 'lamp-hill', belief: 'hill' },
        { id: 'lamp-5' },
      ],
      asides: ['dimmed-first', 'half-a-second', 'lamp-faces-away', 'lit-from-below', 'lit-from-above'],
    },
    {
      id: 'kettle',
      blocks: [
        { id: 'kettle-1' },
        { id: 'kettle-2' },
        { id: 'kettle-count', needs: 'six-wingbeats' },
        { id: 'kettle-3' },
        { id: 'kettle-4' },
        { id: 'kettle-5' },
      ],
      asides: ['the-boil-never-stopped', 'power-came-back-first', 'kettle-for-two'],
    },
    {
      id: 'moth',
      blocks: [
        { id: 'moth-1' },
        { id: 'moth-2' },
        { id: 'moth-3' },
        { id: 'moth-4' },
        { id: 'moth-room', needs: 'the-room-behind' },
        { id: 'moth-5' },
      ],
      asides: ['glass-warm', 'six-wingbeats', 'the-air-did-not-move'],
    },
    {
      id: 'river',
      blocks: [
        { id: 'river-1' },
        { id: 'river-2' },
        { id: 'river-3' },
        { id: 'river-bridge', needs: 'light-on-the-bridge' },
        { id: 'river-4' },
        { id: 'river-5' },
      ],
      asides: ['river-has-no-now', 'bridge-dark', 'the-reflection', 'something-in-the-water'],
    },
    {
      id: 'bus',
      blocks: [
        { id: 'bus-1' },
        { id: 'bus-2' },
        { id: 'bus-3' },
        { id: 'bus-bridge', needs: 'bridge-dark' },
        { id: 'bus-4' },
        { id: 'bus-5' },
      ],
      asides: ['bus-runs-on-itself', 'light-on-the-bridge', 'empty-bus'],
    },
    {
      id: 'radio',
      blocks: [
        { id: 'radio-1' },
        { id: 'radio-2' },
        { id: 'radio-3' },
        { id: 'radio-door', needs: 'door-open' },
        { id: 'radio-4' },
        { id: 'radio-word', needs: 'footsteps-up' },
        { id: 'radio-5' },
      ],
      asides: ['empty-room', 'four-seconds-of-tone', 'the-floorboard', 'radio-kept-going'],
    },
    {
      id: 'clock',
      blocks: [
        { id: 'clock-1' },
        { id: 'clock-2' },
        { id: 'clock-count', needs: 'six-wingbeats' },
        { id: 'clock-3' },
        { id: 'clock-4' },
        { id: 'clock-5' },
      ],
      asides: ['stopped-minute', 'clock-counts-four', 'wound-by-hand'],
    },
    {
      id: 'window',
      blocks: [
        { id: 'window-1' },
        { id: 'window-2' },
        { id: 'window-3' },
        { id: 'window-4' },
        { id: 'window-wool', needs: 'wet-wool' },
        { id: 'window-valley', belief: 'valley' },
        { id: 'window-hill', belief: 'hill' },
        { id: 'window-5' },
      ],
      asides: ['hill-empty', 'window-faces-the-valley', 'the-room-behind', 'no-window-lit'],
    },
    {
      id: 'switch',
      blocks: [
        { id: 'switch-1' },
        { id: 'switch-2' },
        { id: 'switch-clicks', needs: 'two-clicks' },
        { id: 'switch-3' },
        { id: 'switch-4' },
        { id: 'switch-valley', belief: 'valley' },
        { id: 'switch-hill', belief: 'hill' },
        { id: 'switch-5' },
      ],
      asides: ['one-press', 'no-fault', 'the-latch'],
    },
    {
      id: 'road',
      blocks: [
        { id: 'road-1' },
        { id: 'road-2' },
        { id: 'road-3' },
        { id: 'road-4' },
        { id: 'road-valley', belief: 'valley' },
        { id: 'road-hill', belief: 'hill' },
        { id: 'road-press', needs: 'one-press' },
        { id: 'road-water', needs: 'something-in-the-water' },
        { id: 'road-5' },
      ],
      asides: ['footsteps-up', 'none-coming-down', 'road-ends-at-the-box', 'road-stayed-dry'],
    },
    {
      id: 'four-seconds',
      blocks: [
        { id: 'fs-press', needs: 'one-press' },
        { id: 'fs-bridge', needs: 'light-on-the-bridge' },
        { id: 'fs-road', needs: 'footsteps-up' },
        { id: 'fs-windows', needs: 'no-window-lit' },
        { id: 'fs-radio', needs: 'four-seconds-of-tone' },
        { id: 'fs-water', needs: 'road-stayed-dry' },
        { id: 'fs-wool', needs: 'wet-wool' },
      ],
      asides: ['a-hand-on-a-handle', 'nobody-asked'],
      blank: true,
    },
  ],
  contradictions: [
    { id: 'clicks', needs: ['two-clicks', 'one-press'] },
    { id: 'bridge', needs: ['bridge-dark', 'light-on-the-bridge'] },
    { id: 'count', needs: ['six-wingbeats', 'clock-counts-four'] },
    { id: 'hill', needs: ['hill-empty', 'footsteps-up'] },
    { id: 'both', needs: ['lit-from-below', 'lit-from-above'] },
  ],
};

export default GRAPH;

