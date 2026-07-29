'use client';

import { Trash2 } from 'lucide-react';
import NumberFlow from '@number-flow/react';
import {
  createMealRequestSchema,
  mealTypeSchema,
  type MacroTotals,
  type MealItem,
} from '@foodnote/shared';
import {
  useFieldArray,
  useWatch,
  type Control,
  type UseFormReturn,
} from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { cn } from '@/lib/utils';
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
  { name: 'proteinGrams', label: 'Protein', short: 'P' },
  { name: 'carbsGrams', label: 'Carbs', short: 'C' },
  { name: 'fatGrams', label: 'Fat', short: 'F' },
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
  const numeric = (name: keyof MacroTotals) =>
    register(name, { valueAsNumber: true, onChange: onUserEdit });

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <FormGroupLabel>Nutrition</FormGroupLabel>
        <span className="font-sans text-[11px] text-text-muted">
          macros optional
        </span>
      </div>

      {/* One row of four. Calories leads — it is the only required figure and
          the only one the dashboard spends — so it carries the accent while
          the macros stay quiet. */}
      <div className={NUTRIENT_GRID}>
        <NutrientField
          id="totalCalories"
          label="Calories"
          unit="kcal"
          accent
          error={formState.errors.totalCalories?.message}
          {...numeric('totalCalories')}
        />
        {MACRO_FIELDS.map(({ name, label }) => (
          <NutrientField
            key={name}
            id={name}
            label={label}
            unit="g"
            error={formState.errors[name]?.message}
            {...numeric(name)}
          />
        ))}
      </div>
    </section>
  );
}

// Both states of the nutrition block share one grid, so switching between the
// summary and the fields doesn't move a single column.
const NUTRIENT_GRID = 'grid grid-cols-4 gap-2';

/** Micro-caps: four labels have to sit above ~110px columns and still read as
    labels rather than as values. */
const NUTRIENT_LABEL_CLASS =
  'font-sans text-[10px] font-bold tracking-wide text-text-muted uppercase';

function NutrientField({
  id,
  label,
  unit,
  accent,
  error,
  ...props
}: {
  id: string;
  label: string;
  unit: string;
  accent?: boolean;
  error?: string;
} & React.ComponentProps<typeof InputGroupInput>) {
  return (
    <Field className="gap-1.5" data-invalid={!!error || undefined}>
      <label htmlFor={id} className={NUTRIENT_LABEL_CLASS}>
        {label}
      </label>
      <InputGroup variant={accent ? 'field-primary' : 'field'}>
        <InputGroupInput
          id={id}
          aria-invalid={!!error || undefined}
          className="px-2.5 text-right font-sans text-[14.5px] text-text tabular-nums"
          {...numericProps}
          {...props}
        />
        <InputGroupAddon
          align="inline-end"
          className="pr-2 pl-0 text-[11px] font-medium text-text-muted"
        >
          {unit}
        </InputGroupAddon>
      </InputGroup>
      {error && (
        <span className="font-sans text-[11px] text-error">{error}</span>
      )}
    </Field>
  );
}

/**
 * The four totals as one read-only figure. This is the AI preview's default:
 * the items are the editing surface there, so showing the same numbers again
 * as inputs offers an edit the user almost never wants and costs a whole
 * "which one wins" state to support.
 */
export function MealTotalsSummary({
  control,
}: {
  control: Control<MealDraftValues>;
}) {
  const totals = useMealTotals(control);
  const cells = [
    {
      label: 'Calories',
      unit: 'kcal',
      value: totals.totalCalories,
      lead: true,
    },
    { label: 'Protein', unit: 'g', value: totals.proteinGrams },
    { label: 'Carbs', unit: 'g', value: totals.carbsGrams },
    { label: 'Fat', unit: 'g', value: totals.fatGrams },
  ];

  return (
    <div className={NUTRIENT_GRID}>
      {cells.map(({ label, unit, value }) => (
        <Card
          key={label}
          variant="tile"
          className={cn(
            'items-center gap-0.5 px-4 py-3',
            // lead && 'border-primary bg-primary-tint-soft',
          )}
        >
          <span className={NUTRIENT_LABEL_CLASS}>{label}</span>
          <div
            className={cn(
              'flex items-baseline gap-1 font-semibold text-text tabular-nums text-lg',
            )}
          >
            <NumberFlow value={value} />
            <span className="font-sans text-[10px] font-medium text-text-muted">
              {unit}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Watched here rather than at the top of the drawer: subscribing at the root
 * re-renders every item input on each keystroke.
 */
export function useMealTotals(control: Control<MealDraftValues>): MacroTotals {
  const [totalCalories, proteinGrams, carbsGrams, fatGrams] = useWatch({
    control,
    name: ['totalCalories', 'proteinGrams', 'carbsGrams', 'fatGrams'],
  });
  return {
    totalCalories: totalCalories || 0,
    proteinGrams: proteinGrams || 0,
    carbsGrams: carbsGrams || 0,
    fatGrams: fatGrams || 0,
  };
}

// The four editable figures on an item row. Calories is wider: "kcal" is a
// four-character marker where the macros get one.
const ITEM_NUTRIENTS = [
  { name: 'calories', marker: 'kcal', label: 'Calories', wide: true },
  ...MACRO_FIELDS.map(({ name, short, label }) => ({
    name,
    marker: short,
    label,
    wide: false,
  })),
] as const;

const EMPTY_ITEM: MealItem = {
  name: '',
  // Not '': quantityDescription is required and min(1), so an empty string
  // makes an item that cannot be saved. Items only illustrate, so a neutral
  // stand-in is enough.
  quantityDescription: '1 serving',
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
        <Card
          key={field.id}
          variant="panel"
          // Staggered: the parsed items are the payoff of the whole flow, and
          // a cascade reads as "here is what we found" where a simultaneous
          // appearance reads as a repaint. Capped so a ten-item parse doesn't
          // turn into a queue.
          style={{ transitionDelay: `${Math.min(index, 5) * 40}ms` }}
          className="motion-keep-fade gap-2.5 p-3 bg-background rounded-md transition-[opacity,transform] duration-200 ease-out-strong starting:translate-y-1 starting:opacity-0"
        >
          <div className="flex items-center gap-2">
            <Input
              variant="bare"
              aria-label={`Item ${index + 1} name`}
              className="grow-2 basis-0"
              {...form.register(`items.${index}.name`, {
                onChange: onItemsChange,
              })}
            />
            {/* Read-only: it is what makes the calorie figure checkable
                ("Rice — 196 kcal" can't be judged, "Rice, 150 g — 196 kcal"
                can), but the totals are what the user actually corrects. */}
            <span className="shrink-0 font-sans text-[12.5px] text-text-muted tabular-nums">
              {field.quantityDescription}
            </span>
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

          {/* All four figures on one line, each labelled by its addon:
              units go after a number, nutrient names before it, so kcal reads
              as the marker for this box rather than a stray unit. */}
          <div className="flex gap-2">
            {ITEM_NUTRIENTS.map(({ name, label }) => (
              <InputGroup
                key={name}
                variant="cell"
                className={cn('basis-0 h-9 grow')}
              >
                <InputGroupAddon
                  align="inline-end"
                  className="text-[12px] font-normal text-text-muted"
                >
                  {label}
                </InputGroupAddon>
                <InputGroupInput
                  aria-label={`Item ${index + 1} ${label}`}
                  className="px-1 text-center text-[12px] text-text tabular-nums"
                  {...numericProps}
                  {...form.register(`items.${index}.${name}`, {
                    valueAsNumber: true,
                    onChange: onItemsChange,
                  })}
                />
              </InputGroup>
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
