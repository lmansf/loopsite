import type { AccountId } from '@/content/schema';
import type { Figure } from './types';

/**
 * src/figures/registry.ts — one `import()` per account. **OWNED BY WP-C.**
 * Spec: §D.3 ("`FIGURES[slug]()` is an `import()` per account, so a reader who
 * never leaves `dog` downloads one figure").
 *
 * Every specifier is a literal, so the bundler can see all twelve at build
 * time and emit twelve separate chunks; `pnpm budget` then holds each of them
 * under 2 KB gz. Both imports here are `import type` and are erased, so this
 * module is twelve arrow functions and nothing else.
 */
export type FigureLoader = () => Promise<{ default: Figure }>;

export const FIGURES: Readonly<Record<AccountId, FigureLoader>> = {
  'dog': () => import('./dog'),
  'lamp': () => import('./lamp'),
  'kettle': () => import('./kettle'),
  'moth': () => import('./moth'),
  'river': () => import('./river'),
  'bus': () => import('./bus'),
  'radio': () => import('./radio'),
  'clock': () => import('./clock'),
  'window': () => import('./window'),
  'switch': () => import('./switch'),
  'road': () => import('./road'),
  'four-seconds': () => import('./four-seconds'),
};
