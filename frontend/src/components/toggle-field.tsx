import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
  type PathValue,
} from 'react-hook-form';
import { Field, FieldLabel } from '@/components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { LABEL_CLASS } from './form-fields';

export function ToggleField<T extends FieldValues>({
  control,
  name,
  label,
  options,
  defaultValue,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: readonly string[];
  defaultValue?: PathValue<T, Path<T>>;
}) {
  return (
    <Field className="gap-1.75">
      <FieldLabel className={LABEL_CLASS}>{label}</FieldLabel>
      <Controller
        control={control}
        name={name}
        defaultValue={defaultValue}
        render={({ field }) => (
          <ToggleGroup
            value={field.value ? [field.value] : []}
            onValueChange={(values) => values[0] && field.onChange(values[0])}
            spacing={2}
            className="w-full gap-2"
          >
            {options.map((option) => (
              <ToggleGroupItem
                key={option}
                value={option}
                className={cn(
                  'h-11.5 grow basis-0 rounded-sm border border-border font-sans text-text-muted capitalize data-[state=on]:border-[1.5px] data-[state=on]:border-primary data-[state=on]:bg-[#FFF3E7] data-[state=on]:font-semibold data-[state=on]:text-primary-deep',
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
    </Field>
  );
}
