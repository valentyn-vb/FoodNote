'use client';

import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';

type AuthTextFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  /** Shown under the input while the field is valid; errors replace it. */
  description?: string;
} & Omit<React.ComponentProps<'input'>, 'name'>;

/**
 * One labelled, validated text input for the auth forms: wires a
 * react-hook-form Controller to the Field/Input primitives so login and
 * register stay explicit page variants sharing this internal.
 */
export function AuthTextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  type,
  ...inputProps
}: AuthTextFieldProps<T>) {
  // PasswordInput owns its own type (the visibility toggle flips it).
  const InputComponent = type === 'password' ? PasswordInput : Input;
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <InputComponent
            {...field}
            id={name}
            aria-invalid={fieldState.invalid}
            {...(type === 'password' ? {} : { type })}
            {...inputProps}
          />
          {fieldState.invalid ? (
            <FieldError errors={[fieldState.error]} />
          ) : (
            description && <FieldDescription>{description}</FieldDescription>
          )}
        </Field>
      )}
    />
  );
}
