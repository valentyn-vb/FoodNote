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
    // Arrived from `main` (the meal-overview page, #81, and the AI meal drawer,
    // #83) after this branch's rewrite, so they are written in the pre-rewrite
    // classes. They are not restyled onto this system, because #100 on the map
    // (Back to stock shadcn, #94) migrates every call site onto the stock
    // utilities and #101 replaces this rule entirely — styling them twice would
    // be the only outcome. The debt is one grep away: `git grep text-text-muted`.
    ignores: [
      'src/app/(app)/meals/page.tsx',
      'src/app/(app)/meals/desktop-meal-groups.tsx',
      'src/components/meal-line.tsx',
      'src/components/meal-groups-accordion.tsx',
      // The #97 pilot, migrated to the stock utilities ahead of the rule that
      // will permit them. This is the only way the pilot and the old rule
      // coexist for one step; #101 deletes the rule and this list with it.
      'src/app/(app)/dashboard/desktop-dashboard.tsx',
      'src/app/(app)/dashboard/mobile-dashboard.tsx',
      'src/app/(app)/dashboard/stat-widget.tsx',
      'src/app/(app)/dashboard/states.tsx',
      'src/app/(app)/dashboard/weight-history-drawer.tsx',
      // #99 cut `ui/**` back to the upstream variants, so the looks that used
      // to be `Card variant="tile"`, `Button variant="quiet"` and the rest are
      // written where they are used. Same bind as the pilot above: the call
      // site is correct under the rule #101 installs and illegal under the one
      // still standing. Both lists die with the rule.
      'src/app/(app)/profile/page.tsx',
      'src/components/meal-fields.tsx',
      'src/components/meal-log-drawer.tsx',
      'src/components/onboarding/plan-option-card.tsx',
      'src/components/toggle-field.tsx',
      'src/components/weight-form.tsx',
      // #100 migrates the call sites, one screen per commit. Each screen joins
      // this list as it lands, for the same one step as everything above it.
      'src/app/(auth)/layout.tsx',
      'src/app/(auth)/login/login-form.tsx',
      'src/app/(auth)/register/register-form.tsx',
      'src/app/(app)/profile/current-plan-section.tsx',
      'src/app/(app)/profile/personal-details-section.tsx',
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
