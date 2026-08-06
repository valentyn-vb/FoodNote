import { defineConfig } from 'vitest/config';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'path';

// `server-only` exports its no-op entry under the `react-server` condition and
// the one that throws under `default`. Vitest resolves node_modules through Node,
// which knows nothing of that condition, so without this a spec cannot import
// any module behind the guard — `proxy.ts` reaches it through `token.ts`, and
// `proxy.spec.ts` wants the real matcher rather than a copy of it. Located
// through `require.resolve` rather than a path into node_modules, because
// hoisting in a workspace is not ours to predict; the subpath itself is not
// exported, hence the dirname.
const serverOnlyNoop = resolve(
  dirname(createRequire(__filename).resolve('server-only')),
  'empty.js',
);

export default defineConfig({
  test: {
    // Pure utility functions need no DOM. A component spec opts in per file
    // with a `// @vitest-environment jsdom` docblock — Vitest 4 removed
    // `environmentMatchGlobs`, and the docblock is its replacement, so the
    // default stays cheap instead of paying jsdom startup for every
    // pure-logic file too.
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      // An explicit list, not `src/lib/**`: that glob also catches
      // weight-context.tsx, api-client.ts, lib/server/*, lib/actions/* — fetch
      // wrappers and context providers that are integration-shaped, not
      // unit-testable pure functions, and config/lookup files like
      // chart-config.ts and activity-levels.ts where "coverage" is a category
      // error. A blanket threshold across all of src/lib/ would fail on those
      // for reasons this pass never touches. Grow this list as pure modules
      // are added; measuring a provider or a fetch wrapper this way belongs in
      // Playwright, not here.
      include: [
        'src/lib/dashboard-transforms.ts',
        'src/lib/meal-draft.ts',
        'src/lib/user-display.ts',
        'src/lib/weight-range.ts',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // Not a stub: the same file Next loads on the server.
      'server-only': serverOnlyNoop,
    },
  },
});
