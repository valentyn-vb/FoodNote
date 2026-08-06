import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { cn } from '@/lib/utils';

/** Labels a single control. */
export function FormLabel(props: React.ComponentProps<typeof FieldLabel>) {
  return <FieldLabel {...props} />;
}

/**
 * Heads a group of controls (a macro row, a chip set) — no `for` target, so it
 * must not be a <label>. `FieldTitle` is that element, and it carries the same
 * look as the label, which is why neither of these spells one out.
 */
export function FormGroupLabel(props: React.ComponentProps<typeof FieldTitle>) {
  return <FieldTitle {...props} />;
}

export function InputField({
  id,
  label,
  error,
  description,
  ...props
}: {
  id: string;
  label: string;
  error?: string;
  /** Helper text under the control — e.g. a value derived from what was typed. */
  description?: React.ReactNode;
} & React.ComponentProps<typeof Input>) {
  return (
    <Field className="grow basis-0" data-invalid={!!error || undefined}>
      <FormLabel htmlFor={id}>{label}</FormLabel>
      <Input id={id} aria-invalid={!!error || undefined} {...props} />
      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}

/**
 * A number with its unit inside the box: the app's one look for a figure the
 * user types. The unit is an `InputGroupAddon` rather than part of the label,
 * because "kcal" after the digits is what marks the box as that quantity, and
 * the value stays centred with the addon holding the right edge.
 *
 * Shared so the weight drawer and the meal totals cannot drift: the two had the
 * same field drawn twice, one of them with a bespoke headline treatment.
 * `accent` marks the figure the screen is about — the calorie total, the weight.
 */
export function FigureField({
  id,
  label,
  unit,
  accent,
  compact,
  description,
  error,
  className,
  ...props
}: {
  id: string;
  label: string;
  unit: string;
  accent?: boolean;
  /** Helper text under the control — e.g. a value derived from what was typed. */
  description?: React.ReactNode;
  /**
   * The four-across nutrient row, where the label is a quiet caption over a
   * narrow cell rather than a form label. On its own — one field the screen is
   * about — the standard label is the right one.
   */
  compact?: boolean;
  error?: string;
} & React.ComponentProps<typeof InputGroupInput>) {
  return (
    <Field className="grow basis-0" data-invalid={!!error || undefined}>
      <FormLabel
        htmlFor={id}
        className={compact ? 'tracking-wider text-muted-foreground' : undefined}
      >
        {/* The unit is visible inside the box, but `InputGroupAddon` is a
            `role="group"` beside the control — it reaches no accessible name.
            Without this the field announces as "Weight", and 74.2 is of
            nothing. Sighted users already have the addon, so the copy here is
            hidden rather than shown twice. */}
        {label} <span className="sr-only">({unit})</span>
      </FormLabel>
      <InputGroup
        className={cn(
          // `Input` carries no shadow, and these two sit in the same rows: with
          // upstream's `shadow-xs` here, a figure field was the only control on
          // a lip.
          'shadow-none',
          accent && 'border-primary bg-accent',
        )}
      >
        <InputGroupInput
          id={id}
          aria-invalid={!!error || undefined}
          className={cn('px-2 text-center tabular-nums', className)}
          {...props}
        />
        <InputGroupAddon
          align="inline-end"
          className="pr-2.5 text-muted-foreground"
        >
          {unit}
        </InputGroupAddon>
      </InputGroup>
      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
