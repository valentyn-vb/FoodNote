'use client';

import { Trash2Icon } from 'lucide-react';
import NumberFlow from '@number-flow/react';
import {
  caloriesSchema,
  createMealRequestSchema,
  macroGramsSchema,
  mealTypeSchema,
  nutritionPer100gSchema,
  portionGramsSchema,
  perPortion,
  densityFrom,
  type MacroTotals,
  type MealItem,
  type NutritionPer100g,
} from '@foodnote/shared';
import {
  useFieldArray,
  useWatch,
  type Control,
  type FieldArrayWithId,
  type UseFormReturn,
} from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { MacroLine } from '@/components/macro-line';
import { MACRO_FIELDS } from '@/lib/macros';
import { FigureField, FormGroupLabel, InputField } from './form-fields';
import { ToggleField } from './toggle-field';

/**
 * The meal form's field blocks, kept as separate pieces rather than one
 * component with a mode flag: the manual step and the AI confirm step want the
 * same fields in different orders (manual leads with the name, the confirm
 * step leads with the parsed items and drops the meal type to the bottom,
 * where it is confirmed by glance rather than filled in).
 */

/**
 * Extended item schema for the form: adds per-portion display fields (calories,
 * protein, carbs, fat) that are not part of the wire schema (mealItemSchema).
 * For parsed items these are derived from per100g × portionGrams / 100 and
 * recomputed when either changes. For hand-added items (portionGrams = null,
 * per100g = null) they are typed directly by the user.
 * Both drive the meal totals through sumItems but are stripped before posting.
 */
const formItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  quantityDescription: z.string().trim().min(1).max(100),
  portionGrams: portionGramsSchema.nullable(),
  per100g: nutritionPer100gSchema.nullable(),
  calories: caloriesSchema,
  proteinGrams: macroGramsSchema,
  carbsGrams: macroGramsSchema,
  fatGrams: macroGramsSchema,
});

export type FormMealItem = z.infer<typeof formItemSchema>;

/** Everything POST /meals needs except what the drawer supplies itself. */
export const mealDraftSchema = createMealRequestSchema
  .omit({ recordedAt: true, source: true })
  .extend({ items: z.array(formItemSchema).optional() });

export type MealDraftValues = z.infer<typeof mealDraftSchema>;

export const MEAL_FORM_ID = 'meal-draft-form';

/**
 * The two directions between an item as this form holds it and as the contract
 * carries it. They live beside `formItemSchema` because that schema is what they
 * translate — the four per-portion figures are the form's own, added here.
 */

/**
 * An item with its per-portion display figures filled in from the density and
 * the weight: what the inputs show, and what `sumItems` adds up. A hand-added
 * item has no density to derive them from, so it starts at zero and the user
 * types them.
 */
export function withPortionFigures(item: MealItem): FormMealItem {
  return {
    ...item,
    ...(item.per100g && item.portionGrams
      ? perPortion(item.per100g, item.portionGrams)
      : { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 }),
  };
}

/**
 * The items as the contract wants them — the inverse of the above. The four
 * per-portion figures are display only and are not part of `mealItemSchema`;
 * only the weight and the density go on the wire. A meal's own totals are a
 * different thing and are untouched.
 *
 * Two callers: logging a meal, and keeping one for reuse.
 */
export function toWireItems(items: MealDraftValues['items']): MealItem[] {
  // Named rather than reached by discarding the four display fields: that took
  // an eslint-disable for bindings nothing read, and a field the wire schema
  // gains would go missing at runtime instead of failing to compile here.
  return (items ?? []).map(
    ({ name, quantityDescription, portionGrams, per100g }) => ({
      name,
      quantityDescription,
      portionGrams,
      per100g,
    }),
  );
}

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
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <FormGroupLabel>Macros</FormGroupLabel>
        <p className="text-sm text-muted-foreground">Optional</p>
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

/**
 * A nutrient figure: `FigureField` plus the numeric props the value needs.
 * `accent` goes to calories — the only required figure and the only one the
 * dashboard spends — while the macros stay on the stock field surface.
 */
function NutrientField({
  fractional,
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
    <FigureField
      compact
      {...(fractional ? decimalProps : integerProps)}
      {...props}
    />
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
        <div key={label} className="rounded-md bg-muted px-3 py-1.5">
          <span className="block text-xs font-medium tracking-wide text-muted-foreground">
            {label}
          </span>
          <span className="flex items-baseline gap-1 text-base font-semibold tabular-nums">
            <NumberFlow value={Math.round(value)} />
            <span className="text-sm font-normal text-muted-foreground">
              {unit}
            </span>
          </span>
        </div>
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

const EMPTY_ITEM: FormMealItem = {
  name: '',
  // Not '': quantityDescription is required and min(1), so an empty string
  // makes an item that cannot be saved. Items only illustrate, so a neutral
  // stand-in is enough.
  quantityDescription: '1 serving',
  portionGrams: null,
  per100g: null,
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
        <MealItemRow
          key={field.id}
          field={field}
          index={index}
          form={form}
          onRemove={() => {
            remove(index);
            onItemsChange();
          }}
          onItemsChange={onItemsChange}
        />
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

/**
 * The density the figures above were derived from, and the reason the card shows
 * it: "131 kcal per 100 g" can be sanity-checked against what a food is, where
 * "196 kcal" for one portion cannot. It updates as figures are edited, so the
 * implied density is visible while correcting one.
 *
 * The line itself is `MacroLine`, shared with the saved-meal picker.
 */
function Per100gLine({ per100g }: { per100g: NutritionPer100g }) {
  return (
    <MacroLine
      lead="Per 100 g"
      caloriesKcal={per100g.calories}
      macros={per100g}
    />
  );
}

/**
 * One item card. Isolated so the per-100 g row can watch the form's per100g
 * field without re-rendering the sibling items on each density update.
 */
function MealItemRow({
  field,
  index,
  form,
  onRemove,
  onItemsChange,
}: {
  field: FieldArrayWithId<MealDraftValues, 'items', 'id'>;
  index: number;
  form: UseFormReturn<MealDraftValues>;
  onRemove: () => void;
  onItemsChange: () => void;
}) {
  // Live subscription so the read-only per-100 g row updates when a figure
  // is edited and we recompute the density via form.setValue.
  const per100g = useWatch({
    control: form.control,
    name: `items.${index}.per100g`,
  }) as NutritionPer100g | null;

  const isParsed = per100g !== null;

  function handlePortionChange(e: React.ChangeEvent<HTMLInputElement>) {
    const grams = parseFloat(e.target.value);
    const current = form.getValues(`items.${index}.per100g`);
    if (current && grams > 0) {
      const p = perPortion(current, grams);
      form.setValue(`items.${index}.calories`, p.calories);
      form.setValue(`items.${index}.proteinGrams`, p.proteinGrams);
      form.setValue(`items.${index}.carbsGrams`, p.carbsGrams);
      form.setValue(`items.${index}.fatGrams`, p.fatGrams);
      onItemsChange();
    }
  }

  function handleFigureChange(
    figureName: 'calories' | 'proteinGrams' | 'carbsGrams' | 'fatGrams',
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const value = parseFloat(e.target.value);
    const grams = form.getValues(`items.${index}.portionGrams`);
    if (grams && grams > 0 && !isNaN(value)) {
      const density = densityFrom(value, grams);
      form.setValue(`items.${index}.per100g.${figureName}`, density);
    }
    onItemsChange();
  }

  return (
    <Card
      // Staggered: the parsed items are the payoff of the whole flow, and
      // a cascade reads as "here is what we found" where a simultaneous
      // appearance reads as a repaint. Capped so a ten-item parse doesn't
      // turn into a queue.
      style={{ transitionDelay: `${Math.min(index, 5) * 40}ms` }}
      // One line of a list: a fixed-height surface that never flexes, at a
      // tighter radius than the card default.
      className="@container motion-keep-fade bg-accent/20 shadow-none shrink-0 flex-col items-stretch gap-2.5 rounded-md p-3 transition-[opacity,transform] duration-200 ease-out-strong starting:translate-y-1 starting:opacity-0"
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
            // The same fill and radius as the figure fields under it: the row
            // sits on a tinted wash, so a transparent field disappeared into the
            // card and only the placeholder said anything was editable. Flat, and
            // focus is the ring the field already carries — an underline
            // decorates the *element*, so on an empty item it drew a line under
            // the placeholder and "Item name" read as a value to clear first.
            // `placeholder:font-normal` because the weight is on the element:
            // a semibold placeholder reads as a name already typed in.
            className="min-w-24 grow-2 basis-0 rounded-sm bg-card font-semibold shadow-none placeholder:font-normal"
            {...form.register(`items.${index}.name`)}
          />
        )}

        {isParsed ? (
          /* Parsed item: quantityDescription qualifies the weight input
             ("2 large [110] g"), so the calorie figure stays checkable. */
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="text-sm text-muted-foreground">
              {field.quantityDescription}
            </span>
            <InputGroup className="h-8 w-20 rounded-sm bg-card shadow-none">
              <InputGroupInput
                aria-label={`Item ${index + 1} portion grams`}
                {...integerProps}
                max={5000}
                {...form.register(`items.${index}.portionGrams`, {
                  valueAsNumber: true,
                  onChange: handlePortionChange,
                })}
              />
              {/* After the number, like every other unit in this card — and
                  like the way a weight is written. */}
              <InputGroupAddon align="inline-end">g</InputGroupAddon>
            </InputGroup>
          </div>
        ) : (
          /* Hand-added item: no density to scale from, so no weight input.
             Read-only: it is what makes the calorie figure checkable. */
          <span
            title={field.quantityDescription}
            className="min-w-0 shrink truncate text-right text-sm tabular-nums text-muted-foreground"
          >
            {field.quantityDescription}
          </span>
        )}

        {/* The same control as the one on a meal row (`meal-line.tsx`): a muted
            ghost icon carrying its own 44px touch target. `gap-2.5` on the row
            clears the overhang — the target is 6px wider than the 32px box on
            each side, so nothing of the weight input beside it is covered. */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove item ${index + 1}`}
          onClick={onRemove}
          className="touch-target text-muted-foreground"
        >
          <Trash2Icon />
        </Button>
      </div>

      {/* All four figures on one line, each labelled by its addon:
          units go after a number, nutrient names before it, so kcal reads
          as the marker for this box rather than a stray unit. */}
      <div className="grid grid-cols-2 gap-2 @sm:grid-cols-4">
        {/* A compact cell in a dense row, tighter than a form field. White
            and flat: the row already sits on a tinted wash, so a field that
            lifts off it competes with the row, and the fill is what marks it
            editable — the read-only name and quantity beside it are not. */}
        {ITEM_NUTRIENTS.map(({ name, label, marker }) => (
          <InputGroup
            key={name}
            className="h-9 min-w-0 rounded-sm bg-card shadow-none"
          >
            {/* The marker, not the name: four cells across a phone's width have
                no room for "Calories", and `kcal`/`P`/`C`/`F` is how the figures
                are written everywhere else. The full word stays in the field's
                accessible name below, which is what a screen reader announces. */}
            <InputGroupAddon align="inline-end">{marker}</InputGroupAddon>
            <InputGroupInput
              aria-label={`Item ${index + 1} ${label}`}
              className="px-1 text-center"
              {...(name === 'calories' ? integerProps : decimalProps)}
              {...form.register(`items.${index}.${name}`, {
                valueAsNumber: true,
                onChange: (e) => handleFigureChange(name, e),
              })}
            />
          </InputGroup>
        ))}
      </div>

      {/* Only for parsed items: a hand-added one has no density to show. */}
      {isParsed && per100g && <Per100gLine per100g={per100g} />}
    </Card>
  );
}
