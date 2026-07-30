import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import local from './eslint-rules/no-visual-classes.js';

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
    // Scoped with `files` rather than a global `ignores`: the folders left out
    // here — ui/ (where the visual style lives), marketing/, canvasui/ and
    // evilcharts/ (their own visual systems) — must stay under every *other*
    // check, which a global ignore would also switch off.
    files: [
      'src/app/**/*.tsx',
      'src/components/*.tsx',
      'src/components/onboarding/**/*.tsx',
    ],
    plugins: { local },
    rules: {
      // `error`, not `warn`: the migration is complete in the same PR, and a
      // warning is a boundary that erodes on the next deadline.
      'local/no-visual-classes': 'error',
    },
  },
]);

export default eslintConfig;
