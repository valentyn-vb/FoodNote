'use client';

import { createMealRequestSchema, mealTypeSchema } from '@foodnote/shared';
import { type UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import { InputField, LABEL_CLASS } from './form-fields';
import { ToggleField } from './toggle-field';

export const mealFormSchema = createMealRequestSchema.omit({
  recordedAt: true,
  source: true,
  items: true,
});

export type MealFormValues = z.infer<typeof mealFormSchema>;

export const MANUAL_MEAL_FORM_ID = 'manual-meal-form';

// Derived from the enum so a new meal type can't be missed here.
const MEAL_TYPE_OPTIONS = mealTypeSchema.options.map((value) => ({
  value,
  label: value[0].toUpperCase() + value.slice(1),
}));

const MACRO_FIELDS = [
  { name: 'proteinGrams', label: 'Protein (g)' },
  { name: 'carbsGrams', label: 'Carbs (g)' },
  { name: 'fatGrams', label: 'Fat (g)' },
] as const;

type ManualMealFormProps = {
  form: UseFormReturn<MealFormValues>;
  onSubmit: (values: MealFormValues) => void;
};

export function ManualMealForm({ form, onSubmit }: ManualMealFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <form
      id={MANUAL_MEAL_FORM_ID}
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-5"
    >
      <div className="flex">
        <InputField
          id="mealName"
          label="Meal name"
          placeholder="e.g. Chicken with rice"
          error={errors.mealName?.message}
          {...register('mealName')}
        />
      </div>

      <ToggleField
        control={control}
        name="mealType"
        label="Meal type"
        options={MEAL_TYPE_OPTIONS}
      />

      <div className="flex">
        <InputField
          id="totalCalories"
          label="Calories (kcal)"
          type="number"
          inputMode="numeric"
          placeholder="e.g. 720"
          error={errors.totalCalories?.message}
          {...register('totalCalories', { valueAsNumber: true })}
        />
      </div>

      <div className="flex flex-col gap-1.75">
        <div className={LABEL_CLASS}>Macros (optional)</div>
        <div className="flex gap-3">
          {MACRO_FIELDS.map(({ name, label }) => (
            <InputField
              key={name}
              id={name}
              label={label}
              type="number"
              inputMode="numeric"
              error={errors[name]?.message}
              {...register(name, { valueAsNumber: true })}
            />
          ))}
        </div>
      </div>
    </form>
  );
}
