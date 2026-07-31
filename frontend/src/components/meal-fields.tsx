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
import { Field, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
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
//
// The two sets differ because the values do. Calories are whole kcal. Macro
// grams arrive fractional from the parser (7.5 g, 38.4 g), and with the default
// step of 1 the browser calls those a step mismatch — the field reports itself
// invalid to assistive tech while holding a value we accept. `inputMode` matters
// on a phone for the same reason: `numeric` offers no decimal separator, so a
// fractional gram figure can't be typed at all.
const integerProps = {
  type: 'number',
  inputMode: 'numeric',
  step: 1,
  min: 0,
} as const;

const decimalProps = {
  type: 'number',
  inputMode: 'decimal',
  step: 'any',
  min: 0,
} as const;

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
        <p className="text-sm text-muted-foreground">macros optional</p>
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
            fractional
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

function NutrientField({
  id,
  label,
  unit,
  accent,
  fractional,
  error,
  ...props
}: {
  id: string;
  label: string;
  unit: string;
  accent?: boolean;
  /** Grams, not kcal — accepts a decimal and offers the keypad for one. */
  fractional?: boolean;
  error?: string;
} & React.ComponentProps<typeof InputGroupInput>) {
  return (
    <Field className="gap-1.5" data-invalid={!!error || undefined}>
      <label
        htmlFor={id}
        className="text-xs font-bold tracking-wider text-muted-foreground uppercase"
      >
        {label}
      </label>
      {/* Calories leads — the only required figure and the only one the
          dashboard spends — so it carries the accent while the macros stay on
          the stock field surface. */}
      <InputGroup className={accent ? 'border-primary bg-accent' : undefined}>
        <InputGroupInput
          id={id}
          aria-invalid={!!error || undefined}
          className="px-2.5 text-center"
          {...(fractional ? decimalProps : integerProps)}
          {...props}
        />
        <InputGroupAddon align="inline-end" className="pr-2 pl-0">
          {unit}
        </InputGroupAddon>
      </InputGroup>
      {error && <FieldError>{error}</FieldError>}
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
          // A compact stat tile: self-padding, tighter radius and gap.
          className="items-center gap-0.5 rounded-lg px-4 py-3"
        >
          <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            {label}
          </span>
          <span className="flex items-baseline gap-1 text-lg font-bold tabular-nums">
            <NumberFlow value={value} />
            <span className="text-sm font-normal text-muted-foreground">
              {unit}
            </span>
          </span>
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
          // Staggered: the parsed items are the payoff of the whole flow, and
          // a cascade reads as "here is what we found" where a simultaneous
          // appearance reads as a repaint. Capped so a ten-item parse doesn't
          // turn into a queue.
          style={{ transitionDelay: `${Math.min(index, 5) * 40}ms` }}
          // One line of a list: a fixed-height surface that never flexes, at a
          // tighter radius than the card default.
          className="@container motion-keep-fade shrink-0 flex-col items-stretch gap-2.5 rounded-md p-3 transition-[opacity,transform] duration-200 ease-out-strong starting:translate-y-1 starting:opacity-0"
        >
          <div className="flex items-center gap-2">
            {/* A parsed name is a label, not a field: what the user corrects
                here are the figures, and an input invited edits to the one part
                that changes nothing downstream. A hand-added item still needs
                one — it arrives nameless, and the schema requires a name — so
                that case keeps its input. */}
            {field.name ? (
              <span
                title={field.name}
                className="min-w-24 grow-2 basis-0 truncate text-sm font-semibold"
              >
                {field.name}
              </span>
            ) : (
              <Input
                aria-label={`Item ${index + 1} name`}
                placeholder="Item name"
                // Reads as text until focused — an item's name, not a form
                // field: no box, no shadow, the underline does the work.
                className="min-w-24 grow-2 basis-0 border-transparent font-medium shadow-none focus-visible:underline md:text-label"
                {...form.register(`items.${index}.name`)}
              />
            )}
            {/* Read-only: it is what makes the calorie figure checkable
                ("Rice — 196 kcal" can't be judged, "Rice, 150 g — 196 kcal"
                can), but the totals are what the user actually corrects. */}
            <span
              title={field.quantityDescription}
              className="min-w-0 shrink truncate text-right text-sm tabular-nums text-muted-foreground"
            >
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
              <Trash2 />
            </Button>
          </div>

          {/* All four figures on one line, each labelled by its addon:
              units go after a number, nutrient names before it, so kcal reads
              as the marker for this box rather than a stray unit. */}
          <div className="grid grid-cols-2 gap-2 @sm:grid-cols-4">
            {/* A compact cell in a dense row, tighter than a form field. */}
            {ITEM_NUTRIENTS.map(({ name, label }) => (
              <InputGroup key={name} className="h-9 min-w-0 rounded-sm">
                <InputGroupAddon align="inline-end">{label}</InputGroupAddon>
                <InputGroupInput
                  aria-label={`Item ${index + 1} ${label}`}
                  className="px-1 text-center"
                  {...(name === 'calories' ? integerProps : decimalProps)}
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
        className="h-auto w-fit gap-1 p-0"
        onClick={() => {
          append(EMPTY_ITEM);
          onItemsChange();
        }}
      >
        + Add item
      </Button>
    </div>
  );
}
