import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import local from './eslint-rules/no-literal-values.js';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  {
    // All of `src`, `ui/**` included: the rule bans hardcoded values, and a
    // value written in markup is no better inside a component than outside it.
    // This is what replaced the per-file ignore list, which had grown to 26
    // entries — one for every screen migrated ahead of the rule.
    files: ['src/**/*.{ts,tsx}'],
    // The three self-contained visual systems. `canvasui/**` and
    // `evilcharts/**` are vendored and out of scope by the map; `marketing/**`
    // is a slide deck with its own palette — 34 literals whose replacement
    // would mean either redesigning it or minting a token per gradient stop.
    // Neither is this effort's business, so the deck keeps its literals and
    // stays under every other check.
    ignores: [
      'src/components/canvasui/**',
      'src/components/evilcharts/**',
      'src/components/marketing/**',
    ],
    plugins: { local },
    rules: {
      'local/no-literal-values': 'error',
    },
  },
  {
    // `ui/**` is registry code, kept diffable against upstream — and upstream
    // writes `ring-[3px]` and the tooltip arrow's `rounded-[2px]`. An
    // untokenised length is allowed here so those files can stay byte-equal to
    // what `shadcn add` brought. Colour literals and hardcoded type are still
    // errors: the registry never writes those.
    files: ['src/components/ui/**/*.tsx'],
    plugins: { local },
    rules: {
      'local/no-literal-values': ['error', { allowUntokenisedLengths: true }],
    },
  },
]);

export default eslintConfig;
