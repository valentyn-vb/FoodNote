'use client';

import { Field } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ACTIVITY_LEVEL_LABELS } from '@/lib/activity-levels';
import { activityLevelSchema, sexSchema } from '@foodnote/shared';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { FormLabel, InputField } from '../form-fields';
import { ToggleField } from '../toggle-field';
import type { OnboardingFormValues } from './form-schema';

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
        <InputField
          id="age"
          label="Age"
          type="number"
          inputMode="numeric"
          error={errors.age?.message}
          {...register('age', { valueAsNumber: true })}
        />
        <InputField
          id="heightCm"
          label="Height (cm)"
          type="number"
          inputMode="numeric"
          error={errors.heightCm?.message}
          {...register('heightCm', { valueAsNumber: true })}
        />
      </div>

      <ToggleField
        control={control}
        name="sex"
        label="Sex"
        options={sexSchema.options}
        defaultValue={sexSchema.options[0]}
        error={errors.sex?.message}
      />

      <div className="flex gap-3">
        <InputField
          id="currentWeightKg"
          label="Current weight (kg)"
          type="number"
          inputMode="numeric"
          error={errors.currentWeightKg?.message}
          {...register('currentWeightKg', { valueAsNumber: true })}
        />
        <InputField
          id="targetWeightKg"
          label="Target weight (kg)"
          type="number"
          inputMode="numeric"
          error={errors.targetWeightKg?.message}
          {...register('targetWeightKg', { valueAsNumber: true })}
        />
      </div>

      <Field className="gap-1.75">
        <FormLabel>Activity level</FormLabel>
        <Controller
          control={control}
          name="activityLevel"
          render={({ field }) => (
            <Select
              value={field.value ?? null}
              onValueChange={field.onChange}
              items={ACTIVITY_LEVEL_LABELS}
            >
              <SelectTrigger className="h-11.5 w-full border-border bg-surface px-3.5 font-sans text-[14.5px] text-text shadow-hairline">
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
