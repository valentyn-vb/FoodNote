import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export const LABEL_CLASS = 'font-sans text-caption font-medium text-text';
export const INPUT_CLASS =
  'h-11.5 rounded-sm border-border bg-surface px-3.5 font-sans text-[14.5px] text-text shadow-[0_1px_2px_#00000008] focus-visible:border-primary focus-visible:ring-0';

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
    <Field
      className="grow basis-0 gap-1.75"
      data-invalid={!!error || undefined}
    >
      <FieldLabel htmlFor={id} className={LABEL_CLASS}>
        {label}
      </FieldLabel>
      <Input
        id={id}
        aria-invalid={!!error || undefined}
        className={INPUT_CLASS}
        {...props}
      />
      {description && (
        <FieldDescription className="font-sans text-[12.5px]">
          {description}
        </FieldDescription>
      )}
      {error && (
        <FieldError className="font-sans text-[12px]">{error}</FieldError>
      )}
    </Field>
  );
}
