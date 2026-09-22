import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

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
    rules: {
      // Loop is ONE route (§C.10). Every in-site link is a real <a href> so it
      // works with zero JS, middle-click and screen readers, and ALL history is
      // written by src/lib/url-state.ts. next/link would run the app router
      // instead, which is exactly what this architecture must not do.
      '@next/next/no-html-link-for-pages': 'off',
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
    // RoomLayer resolves the active room's component from a module-level cache
    // keyed by slug. Its identity is stable for the lifetime of the page — that
    // is the entire point of the cache — but the rule cannot see that.
    files: ['src/components/ring/RoomLayer.tsx'],
    rules: { 'react-hooks/static-components': 'off' },
  },
  // The two modules that are allowed to own those primitives.
  {
    files: ['src/lib/use-motion-preference.ts', 'src/lib/storage.ts', 'src/lib/hero-bootstrap.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
    'reports/**',
  ]),
]);
