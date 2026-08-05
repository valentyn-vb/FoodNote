'use client';

import { Field } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ACTIVITY_LEVEL_LABELS } from '@/lib/enum-labels';
import { activityLevelSchema, sexSchema } from '@foodnote/shared';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { FigureField, FormLabel, InputField } from '../form-fields';
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
      className="flex flex-col gap-5"
    >
      <div className="flex gap-3">
        {/* Centred and tabular like the figure fields beside it: Age is the one
            number in this form with no unit to put in an addon, and left-aligned
            it was the only value in the row sitting under its label. */}
        <InputField
          id="age"
          label="Age"
          type="number"
          inputMode="numeric"
          className="text-center tabular-nums"
          error={errors.age?.message}
          {...register('age', { valueAsNumber: true })}
        />
        <FigureField
          id="heightCm"
          label="Height"
          unit="cm"
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
        <FigureField
          id="currentWeightKg"
          label="Current weight"
          unit="kg"
          type="number"
          inputMode="numeric"
          error={errors.currentWeightKg?.message}
          {...register('currentWeightKg', { valueAsNumber: true })}
        />
        <FigureField
          id="targetWeightKg"
          label="Target weight"
          unit="kg"
          type="number"
          inputMode="numeric"
          error={errors.targetWeightKg?.message}
          {...register('targetWeightKg', { valueAsNumber: true })}
        />
      </div>

      <Field>
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
              {/* `w-fit` is the stock trigger's default; a select filling a
                  form row is layout, not a variant. `shadow-none` because
                  `Input` carries no shadow: side by side in one form, the
                  trigger was the only control sitting on a lip. */}
              <SelectTrigger className="w-full shadow-none">
                <SelectValue placeholder="Select activity level" />
              </SelectTrigger>
              {/* Drawn and placed as the sidebar's user menu is: `p-1` around
                  the list, and dropped below the trigger's leading edge rather
                  than over it — `alignItemWithTrigger` overlays the popup on
                  the control, which no other menu in the app does. */}
              <SelectContent
                className="p-1"
                align="start"
                alignItemWithTrigger={false}
              >
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
