import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/**
 * The corpus may not be imported from a `'use client'` module.
 *
 * design/11-narrative-build-spec.md §E item 3 and §I.8: the story ships
 * exactly once, in the document. One import of `src/content/accounts.ts` from
 * a client module would put all ~5000 words into Tier B on top of the HTML
 * that already carries them, and would quietly forfeit the reason the locked
 * blocks, the belief variants and the `four seconds` blanks are
 * attribute-and-CSS mechanisms at all.
 *
 * This is a whole rule rather than a `no-restricted-imports` pattern because
 * "a client module" is a property of the file's contents — the `'use client'`
 * directive — and not of its path. `src/lib/**` is separately forbidden the
 * import outright below, which is what keeps the engine free of the story.
 */
const corpusRule = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      banned:
        "the corpus may not be imported from a 'use client' module — the story ships in the document, not in Tier B (spec §E). Use @/lib/knowledge, which is built on the prose-free graph.",
    },
  },
  create(context) {
    const isCorpus = (value) =>
      typeof value === 'string' && /(^|\/)content\/accounts(\.ts)?$/.test(value);

    let clientModule = false;
    return {
      Program(node) {
        clientModule = node.body.some(
          (n) =>
            n.type === 'ExpressionStatement' &&
            (n.directive === 'use client' ||
              (n.expression.type === 'Literal' && n.expression.value === 'use client')),
        );
      },
      ImportDeclaration(node) {
        if (clientModule && isCorpus(node.source.value)) {
          context.report({ node, messageId: 'banned' });
        }
      },
      ImportExpression(node) {
        if (clientModule && node.source.type === 'Literal' && isCorpus(node.source.value)) {
          context.report({ node, messageId: 'banned' });
        }
      },
    };
  },
};

const loop = { rules: { 'no-corpus-in-client': corpusRule } };

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // eslint-plugin-react@7.37.5 cannot auto-detect the React version under
    // ESLint 10 (it calls context.getFilename(), removed in v10). Pinning the
    // version here skips that code path entirely.
    settings: { react: { version: '19.3.0' } },
  },
  {
    plugins: { loop },
    rules: {
      // The site is ONE route (§C.11). Every in-site link is a real <a href> so
      // it works with zero JS, on a middle click and in a screen reader, and
      // ALL history is written by src/lib/url-state.ts. next/link would run the
      // app router instead, which is exactly what this architecture must not do.
      '@next/next/no-html-link-for-pages': 'off',
      'loop/no-corpus-in-client': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='matchMedia'][arguments.0.value=/prefers-reduced-motion/]",
          message: 'Use useMotionPreference() from @/lib/use-motion-preference instead.',
        },
        {
          selector: "MemberExpression[object.name='localStorage']",
          message: 'Use readState/writeState from @/lib/storage instead.',
        },
      ],
    },
  },
  {
    // The engine is not the story (§E item 3). `src/lib/**` runs in the
    // browser, so it reads the generated prose-free `src/lib/graph.ts` and
    // never the corpus — including transitively, which is the hole a
    // directive-based rule alone would leave open.
    files: ['src/lib/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/content/accounts', '**/content/accounts', '**/content/accounts.ts'],
              message:
                'the engine may not import the corpus — use src/lib/graph.ts, or take the corpus as an argument (spec §E).',
            },
          ],
        },
      ],
    },
  },
  {
    // Playwright's fixture API passes a callback named `use`, which the React
    // hooks rule mistakes for React's `use()`. Tests are not React.
    files: ['tests/**/*.ts'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
  // The three modules that are allowed to own those primitives.
  {
    files: ['src/lib/use-motion-preference.ts', 'src/lib/storage.ts', 'src/lib/boot.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  globalIgnores([
    '.next/**',
    '.next-*/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
    'reports/**',
    '.claude/**',
  ]),
]);
