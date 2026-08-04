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
  stackBelowMd,
  className,
  ...aria
}: {
  value: T;
  onValueChange: (next: T) => void;
  options: readonly ToggleOption<T>[];
  /**
   * A column on a phone, a row from 768 up: three boxes share 576px well and a
   * phone's width less so. It lives here because turning the axis is not one
   * class — the group centres its children and the items divide the main axis,
   * so the item's own sizing has to turn with it.
   */
  stackBelowMd?: boolean;
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
      className={cn(
        'w-full gap-2',
        stackBelowMd && 'max-md:flex-col max-md:items-stretch',
        className,
      )}
      {...aria}
    >
      {options.map(({ value: option, label, Icon }) => (
        <ToggleGroupItem
          key={option}
          value={option}
          size="lg"
          className={cn(
            // One choice among a few, reading as its own option rather than as
            // a pressed button. Selection is on `data-pressed`, the attribute
            // Base UI actually emits; the border keeps its width and only
            // changes colour, so choosing an option doesn't nudge it half a
            // pixel in every direction.
            'gap-2 border border-border bg-card capitalize text-muted-foreground hover:border-primary/60 data-pressed:border-primary data-pressed:bg-accent data-pressed:font-semibold data-pressed:text-foreground',
            // Dividing the row is what a row costs; stacked, an item is already
            // as wide as the group and growing would only stretch its height.
            stackBelowMd ? 'md:grow md:basis-0' : 'grow basis-0',
            // Four labels (meal types) need tighter items than two (sex) to fit
            // one row on a narrow screen. Narrower, not smaller: the type level
            // is the same either way. Not when stacked: a column has the width.
            options.length > 2 && !stackBelowMd && 'px-1',
          )}
        >
          {Icon && <Icon />}
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
