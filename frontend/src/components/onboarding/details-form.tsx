'use client';

import { Field, FieldLabel } from '@/components/ui/field';
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
import { LABEL_CLASS, NumberField, TOGGLE_ITEM_CLASS } from '../form-fields';
import type { OnboardingFormValues } from './form-schema';

// A caller-owned submit button elsewhere on the page reaches this form via
// the `form` attribute, so the same fields work under any surrounding chrome
// (onboarding's own header/footer, a profile-edit dialog's header/footer).
export const DETAILS_FORM_ID = 'details-form';

type DetailsFormProps = {
  /** Shared form instance owned by the caller, so values survive step changes / dialog reopens. */
  form: UseFormReturn<OnboardingFormValues>;
  onSubmit: (values: OnboardingFormValues) => void;
};

export function DetailsForm({ form, onSubmit }: DetailsFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <form
      id={DETAILS_FORM_ID}
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-5 px-5 pt-4.5"
    >
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
              onValueChange={(values) => values[0] && field.onChange(values[0])}
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
    </form>
  );
}
