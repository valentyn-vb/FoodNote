import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
  type PathValue,
} from 'react-hook-form';
import { Field, FieldError } from '@/components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { FormLabel } from './form-fields';

export function ToggleField<T extends FieldValues>({
  control,
  name,
  label,
  options,
  defaultValue,
  error,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: readonly string[];
  defaultValue?: PathValue<T, Path<T>>;
  error?: string;
}) {
  return (
    <Field className="gap-1.75" data-invalid={!!error || undefined}>
      <FormLabel>{label}</FormLabel>
      <Controller
        control={control}
        name={name}
        defaultValue={defaultValue}
        render={({ field }) => (
          <ToggleGroup
            value={field.value ? [field.value] : []}
            onValueChange={(values) => values[0] && field.onChange(values[0])}
            // The visible FormLabel has no `for` target to bind to a group, so
            // name the group itself or a screen reader announces bare options.
            aria-label={label}
            aria-invalid={!!error || undefined}
            spacing={2}
            className="w-full gap-2"
          >
            {options.map((option) => (
              <ToggleGroupItem
                key={option}
                value={option}
                size="lg"
                className={cn(
                  // One choice among a few, reading as its own option rather
                  // than as a pressed button. Selection is on `data-pressed`,
                  // the attribute Base UI actually emits; the border keeps its
                  // width and only changes colour, so choosing an option
                  // doesn't nudge it half a pixel in every direction.
                  'grow basis-0 border border-border bg-card capitalize text-muted-foreground hover:border-primary/60 data-pressed:border-primary data-pressed:bg-accent data-pressed:font-semibold data-pressed:text-foreground',
                  // Four labels (meal types) need tighter items than two (sex)
                  // to fit one row on a narrow screen. Narrower, not smaller:
                  // the type level is the same either way.
                  options.length > 2 && 'px-1',
                )}
              >
                {option}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      />
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
