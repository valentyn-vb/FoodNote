'use client';

import { Field, FieldLabel } from '@/components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  createMealRequestSchema,
  mealTypeSchema,
  type MealType,
} from '@foodnote/shared';
import { Controller, type UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import { InputField, LABEL_CLASS } from './form-fields';

export const mealFormSchema = createMealRequestSchema.omit({
  recordedAt: true,
  source: true,
  items: true,
});

export type MealFormValues = z.infer<typeof mealFormSchema>;

export const MANUAL_MEAL_FORM_ID = 'manual-meal-form';

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

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

      <Field className="gap-1.75">
        <FieldLabel className={LABEL_CLASS}>Meal type</FieldLabel>
        <Controller
          control={control}
          name="mealType"
          render={({ field }) => (
            <ToggleGroup
              value={field.value ? [field.value] : []}
              onValueChange={(values) => values[0] && field.onChange(values[0])}
              spacing={2}
              className="w-full gap-2"
            >
              {mealTypeSchema.options.map((type) => (
                <ToggleGroupItem
                  key={type}
                  value={type}
                  className={
                    'h-11.5 grow basis-0 rounded-sm border border-border font-sans text-text-muted data-[state=on]:border-[1.5px] data-[state=on]:border-primary data-[state=on]:bg-[#FFF3E7] data-[state=on]:font-semibold data-[state=on]:text-primary-deep px-0 text-[12.5px]'
                  }
                >
                  {MEAL_TYPE_LABELS[type]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        />
      </Field>

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
