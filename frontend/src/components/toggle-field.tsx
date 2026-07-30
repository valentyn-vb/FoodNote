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
                className={cn(
                  'h-11.5 grow basis-0 border border-border font-sans text-text-muted capitalize data-[state=on]:border-[1.5px] data-[state=on]:border-primary data-[state=on]:bg-primary-tint data-[state=on]:font-semibold data-[state=on]:text-primary-deep',
                  // Four labels (meal types) need tighter items than two (sex)
                  // to fit one row on a narrow screen.
                  options.length > 2 && 'px-1 text-[12.5px]',
                )}
              >
                {option}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      />
      {error && (
        <FieldError className="font-sans text-[12px]">{error}</FieldError>
      )}
    </Field>
  );
}
