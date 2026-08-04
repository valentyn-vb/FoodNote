import type { ComponentType } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

export type ToggleOption<T extends string = string> = {
  value: T;
  /** Lowercase is fine: the items carry `capitalize`, so `lunch` reads as Lunch. */
  label: string;
  Icon?: ComponentType<{ className?: string }>;
};

/**
 * One choice among a few, drawn as a row of boxes rather than as radios. Extracted
 * from `ToggleField` when the theme picker wanted the same look without a form
 * around it: two call sites sharing a look is a component, not a copied class
 * string.
 *
 * `ToggleField` keeps the form wiring (Controller, label, error) and delegates
 * the drawing here; anything not inside a form uses this directly.
 */
export function OptionToggle<T extends string>({
  value,
  onValueChange,
  options,
  className,
  ...aria
}: {
  value: T;
  onValueChange: (next: T) => void;
  options: readonly ToggleOption<T>[];
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-invalid'?: boolean;
}) {
  return (
    <ToggleGroup
      value={value ? [value] : []}
      // Guarded: Base UI clears the set when the pressed item is pressed again,
      // and one of these always has to be chosen.
      onValueChange={(values) => values[0] && onValueChange(values[0] as T)}
      spacing={2}
      className={cn('w-full gap-2', className)}
      {...aria}
    >
      {options.map(({ value: option, label, Icon }) => (
        <ToggleGroupItem
          key={option}
          value={option}
          size="lg"
          className={cn(
            'gap-2 grow basis-0 border border-border bg-card capitalize text-muted-foreground hover:border-primary/60 data-pressed:border-primary data-pressed:bg-accent data-pressed:font-semibold data-pressed:text-foreground',
          )}
        >
          {Icon && <Icon />}
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
