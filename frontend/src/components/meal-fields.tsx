'use client';

import { Trash2 } from 'lucide-react';
import {
  createMealRequestSchema,
  mealTypeSchema,
  type MealItem,
} from '@foodnote/shared';
import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormGroupLabel, InputField } from './form-fields';
import { ToggleField } from './toggle-field';

/**
 * The meal form's field blocks, kept as separate pieces rather than one
 * component with a mode flag: the manual step and the AI confirm step want the
 * same fields in different orders (manual leads with the name, the confirm
 * step leads with the parsed items and drops the meal type to the bottom,
 * where it is confirmed by glance rather than filled in).
 */

/** Everything POST /meals needs except what the drawer supplies itself. */
export const mealDraftSchema = createMealRequestSchema.omit({
  recordedAt: true,
  source: true,
});

export type MealDraftValues = z.infer<typeof mealDraftSchema>;

export const MEAL_FORM_ID = 'meal-draft-form';

const MACRO_FIELDS = [
  { name: 'proteinGrams', label: 'Protein (g)', short: 'P' },
  { name: 'carbsGrams', label: 'Carbs (g)', short: 'C' },
  { name: 'fatGrams', label: 'Fat (g)', short: 'F' },
] as const;

// `type="number"` keeps RHF's numeric coercion and the numeric keypad; ui/Input
// handles the wheel-rewrites-the-value hazard that comes with it.
const numericProps = { type: 'number', inputMode: 'numeric' } as const;

export function MealNameField({
  form,
}: {
  form: UseFormReturn<MealDraftValues>;
}) {
  return (
    <div className="flex">
      <InputField
        id="mealName"
        label="Meal name"
        placeholder="e.g. Chicken with rice"
        error={form.formState.errors.mealName?.message}
        {...form.register('mealName')}
      />
    </div>
  );
}

export function MealTypeField({
  form,
}: {
  form: UseFormReturn<MealDraftValues>;
}) {
  return (
    <ToggleField
      control={form.control}
      name="mealType"
      label="Meal type"
      options={mealTypeSchema.options}
      error={form.formState.errors.mealType?.message}
    />
  );
}

/**
 * `onUserEdit` fires when the person types into a total — the signal that the
 * items stop driving it (ADR-0008). Reported explicitly, because the caller
 * cannot otherwise tell a keystroke apart from a value it set itself.
 */
export function MealTotalsFields({
  form,
  onUserEdit,
}: {
  form: UseFormReturn<MealDraftValues>;
  onUserEdit?: () => void;
}) {
  const { register, formState } = form;
  return (
    <>
      <div className="flex">
        <InputField
          id="totalCalories"
          label="Calories (kcal)"
          placeholder="e.g. 720"
          error={formState.errors.totalCalories?.message}
          {...numericProps}
          {...register('totalCalories', {
            valueAsNumber: true,
            onChange: onUserEdit,
          })}
        />
      </div>

      <div className="flex flex-col gap-1.75">
        <FormGroupLabel>Macros (optional)</FormGroupLabel>
        <div className="flex gap-3">
          {MACRO_FIELDS.map(({ name, label }) => (
            <InputField
              key={name}
              id={name}
              label={label}
              error={formState.errors[name]?.message}
              {...numericProps}
              {...register(name, {
                valueAsNumber: true,
                onChange: onUserEdit,
              })}
            />
          ))}
        </div>
      </div>
    </>
  );
}

const EMPTY_ITEM: MealItem = {
  name: '',
  quantityDescription: '',
  calories: 0,
  proteinGrams: 0,
  carbsGrams: 0,
  fatGrams: 0,
};

/**
 * The parsed breakdown, editable per line. `onItemsChange` fires after any
 * edit so the drawer can re-derive the totals — the derive rule lives there,
 * not here, because it also has to know whether the user has since set a
 * total by hand.
 */
export function MealItemsFields({
  form,
  onItemsChange,
}: {
  form: UseFormReturn<MealDraftValues>;
  onItemsChange: () => void;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  return (
    <div className="flex flex-col gap-2">
      <FormGroupLabel>Items ({fields.length})</FormGroupLabel>

      {fields.map((field, index) => (
        <Card key={field.id} variant="panel" className="gap-2.5 p-3">
          <div className="flex items-center gap-2">
            <Input
              variant="bare"
              aria-label={`Item ${index + 1} name`}
              className="grow-2 basis-0"
              {...form.register(`items.${index}.name`, {
                onChange: onItemsChange,
              })}
            />
            <Input
              variant="cell"
              aria-label={`Item ${index + 1} amount`}
              className="w-20 shrink-0"
              {...form.register(`items.${index}.quantityDescription`, {
                onChange: onItemsChange,
              })}
            />
            <Input
              variant="cell"
              aria-label={`Item ${index + 1} calories`}
              className="w-16 shrink-0"
              {...numericProps}
              {...form.register(`items.${index}.calories`, {
                valueAsNumber: true,
                onChange: onItemsChange,
              })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove item ${index + 1}`}
              onClick={() => {
                remove(index);
                onItemsChange();
              }}
            >
              <Trash2 className="text-text-muted" />
            </Button>
          </div>

          <div className="flex gap-2">
            {MACRO_FIELDS.map(({ name, label, short }) => (
              <label
                key={name}
                className="flex grow basis-0 items-center gap-1.5 font-sans text-[11.5px] text-text-muted"
              >
                {short}
                <Input
                  variant="cell-sm"
                  aria-label={`Item ${index + 1} ${label}`}
                  {...numericProps}
                  {...form.register(`items.${index}.${name}`, {
                    valueAsNumber: true,
                    onChange: onItemsChange,
                  })}
                />
              </label>
            ))}
          </div>
        </Card>
      ))}

      <Button
        type="button"
        variant="link"
        size="inline"
        onClick={() => {
          append(EMPTY_ITEM);
          onItemsChange();
        }}
        className="w-fit text-caption font-medium text-primary-deep no-underline"
      >
        + Add item
      </Button>
    </div>
  );
}
