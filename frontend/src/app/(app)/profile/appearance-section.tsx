'use client';

import { APPEARANCE_OPTIONS } from '@/components/appearance-options';
import { useAppearance } from '@/components/appearance-provider';
import { OptionToggle } from '@/components/option-toggle';
import { Card } from '@/components/ui/card';
import { FieldDescription } from '@/components/ui/field';

const HEADING_ID = 'theme-heading';

/**
 * The only section here that takes no profile props: the appearance lives in
 * AppearanceProvider, because the sidebar's menu offers the same setting and the
 * two must not disagree.
 *
 * "Theme" on screen, `appearance` in the code: the user-facing word is the one
 * every other app uses, and the code's word is the one that isn't already taken
 * by the token set (ADR 0014).
 *
 * The same control the meal drawer uses for Meal type — boxes that read as their
 * own options, no radio dots — through the component both share. The heading
 * names the group via `aria-labelledby`, which is what a `fieldset`/`legend`
 * would otherwise be for. No `useForm`: three fixed values have nothing to
 * validate, and the only failure is a network one, which the provider raises as
 * a toast.
 */
export function AppearanceSection() {
  const { appearance, setAppearance } = useAppearance();

  return (
    <section className="flex flex-col gap-2.5">
      <h2 id={HEADING_ID} className="text-sm text-muted-foreground px-2">
        Theme
      </h2>
      <Card className="gap-3 p-4">
        <OptionToggle
          aria-labelledby={HEADING_ID}
          value={appearance}
          onValueChange={setAppearance}
          options={APPEARANCE_OPTIONS}
        />
        <FieldDescription>
          {APPEARANCE_OPTIONS.find((o) => o.value === appearance)?.hint}
        </FieldDescription>
      </Card>
    </section>
  );
}
