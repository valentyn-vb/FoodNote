import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
  type PathValue,
} from 'react-hook-form';
import { Field, FieldError } from '@/components/ui/field';
import { OptionToggle } from './option-toggle';
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
          <OptionToggle
            value={field.value}
            onValueChange={field.onChange}
            // Meal types and sexes are their own labels; the items capitalize
            // them for display.
            options={options.map((value) => ({ value, label: value }))}
            // The visible FormLabel has no `for` target to bind to a group, so
            // name the group itself or a screen reader announces bare options.
            aria-label={label}
            aria-invalid={!!error || undefined}
          />
        )}
      />
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
