'use client';

import { Disclaimer } from '@/components/disclaimer';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ACTIVITY_LEVEL_LABELS } from '@/lib/activity-levels';
import { activityLevelSchema } from '@foodnote/shared';
import { Controller, type UseFormReturn } from 'react-hook-form';
import type { OnboardingFormValues } from './form-schema';

const TOGGLE_ITEM_CLASS =
  'h-11.5 grow basis-0 rounded-sm border border-border font-sans text-text-muted data-[state=on]:border-[1.5px] data-[state=on]:border-primary data-[state=on]:bg-[#FFF3E7] data-[state=on]:font-semibold data-[state=on]:text-primary-deep';

const LABEL_CLASS = 'font-sans text-caption font-medium text-text';
const INPUT_CLASS =
  'h-11.5 rounded-sm border-border bg-surface px-3.5 font-sans text-[14.5px] text-text shadow-[0_1px_2px_#00000008] focus-visible:border-primary focus-visible:ring-0';

function NumberField({
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
      <FieldLabel htmlFor={id} className={LABEL_CLASS}>
        {label}
      </FieldLabel>
      <Input
        id={id}
        aria-invalid={!!error || undefined}
        className={INPUT_CLASS}
        {...props}
      />
      {error && (
        <FieldError className="font-sans text-[12px]">{error}</FieldError>
      )}
    </Field>
  );
}

type DetailsFormProps = {
  /** Shared form instance owned by the wizard, so values survive step changes. */
  form: UseFormReturn<OnboardingFormValues>;
  onContinue: () => void;
};

export function DetailsForm({ form, onContinue }: DetailsFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <form
      onSubmit={handleSubmit(() => onContinue())}
      noValidate
      className="mx-auto flex w-full max-w-md flex-col bg-bg pt-1.5 pb-5"
    >
      <div className="flex flex-col gap-1 px-5 pb-4.5">
        <h1 className="font-display text-[26px] font-semibold tracking-[-0.01em] text-text">
          Tell us about you
        </h1>
        <p className="font-sans text-label text-text-muted">
          We&apos;ll use this to calculate your daily calorie target.
        </p>
      </div>

      <div className="flex flex-col gap-5 px-5 pt-4.5">
        <div className="flex gap-3">
          <NumberField
            id="age"
            label="Age"
            type="number"
            inputMode="numeric"
            error={errors.age?.message}
            {...register('age', { valueAsNumber: true })}
          />
          <NumberField
            id="heightCm"
            label="Height (cm)"
            type="number"
            inputMode="numeric"
            error={errors.heightCm?.message}
            {...register('heightCm', { valueAsNumber: true })}
          />
        </div>

        <Field className="gap-1.75">
          <FieldLabel className={LABEL_CLASS}>Sex</FieldLabel>
          <Controller
            control={control}
            name="sex"
            render={({ field }) => (
              <ToggleGroup
                value={field.value ? [field.value] : []}
                onValueChange={(values) =>
                  values[0] && field.onChange(values[0])
                }
                spacing={2}
                className="w-full gap-2"
              >
                <ToggleGroupItem value="female" className={TOGGLE_ITEM_CLASS}>
                  Female
                </ToggleGroupItem>
                <ToggleGroupItem value="male" className={TOGGLE_ITEM_CLASS}>
                  Male
                </ToggleGroupItem>
              </ToggleGroup>
            )}
          />
        </Field>

        <div className="flex gap-3">
          <NumberField
            id="currentWeightKg"
            label="Current weight (kg)"
            type="number"
            inputMode="numeric"
            error={errors.currentWeightKg?.message}
            {...register('currentWeightKg', { valueAsNumber: true })}
          />
          <NumberField
            id="targetWeightKg"
            label="Target weight (kg)"
            type="number"
            inputMode="numeric"
            error={errors.targetWeightKg?.message}
            {...register('targetWeightKg', { valueAsNumber: true })}
          />
        </div>

        <Field className="gap-1.75">
          <FieldLabel className={LABEL_CLASS}>Activity level</FieldLabel>
          <Controller
            control={control}
            name="activityLevel"
            render={({ field }) => (
              <Select
                value={field.value ?? null}
                onValueChange={field.onChange}
                items={ACTIVITY_LEVEL_LABELS}
              >
                <SelectTrigger className="h-11.5 w-full rounded-sm border-border bg-surface px-3.5 font-sans text-[14.5px] text-text shadow-[0_1px_2px_#00000008]">
                  <SelectValue placeholder="Select activity level" />
                </SelectTrigger>
                <SelectContent>
                  {activityLevelSchema.options.map((level) => (
                    <SelectItem key={level} value={level}>
                      {ACTIVITY_LEVEL_LABELS[level]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>

      <Disclaimer className="px-5 pt-4 pb-1" />

      <div className="flex flex-col gap-2.5 px-5 pt-3">
        <Button
          type="submit"
          className="h-12.5 w-full rounded-sm bg-primary text-[15px] shadow-[0_2px_8px_#f5a65c59]"
        >
          Continue
        </Button>
      </div>
    </form>
  );
}
