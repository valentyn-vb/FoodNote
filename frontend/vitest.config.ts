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
    // Pure utility functions — no DOM needed.
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // Not a stub: the same file Next loads on the server.
      'server-only': serverOnlyNoop,
    },
  },
});
