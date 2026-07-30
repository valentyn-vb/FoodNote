import {
  Field,
  FieldError,
  FieldLabel,
  FieldTitle,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

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
  ...props
}: { id: string; label: string; error?: string } & React.ComponentProps<
  typeof Input
>) {
  return (
    <Field
      className="grow basis-0 gap-1.75"
      data-invalid={!!error || undefined}
    >
      <FormLabel htmlFor={id}>{label}</FormLabel>
      <Input
        id={id}
        variant="field"
        aria-invalid={!!error || undefined}
        {...props}
      />
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
