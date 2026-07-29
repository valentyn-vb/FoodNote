import { cn } from '@/lib/utils';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

// One definition of the label look, shared by the two elements that need it.
// A component pair rather than an exported class string, so no call site can
// merge its own overrides on top.
const labelClasses = 'font-sans text-caption font-medium text-text';

/** Labels a single control. */
export function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof FieldLabel>) {
  return <FieldLabel className={cn(labelClasses, className)} {...props} />;
}

/** Heads a group of controls (a macro row, a chip set) — no `for` target, so
    it must not be a <label>. */
export function FormGroupLabel({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return <div className={cn(labelClasses, className)} {...props} />;
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
      {error && (
        <FieldError className="font-sans text-[12px]">{error}</FieldError>
      )}
    </Field>
  );
}
