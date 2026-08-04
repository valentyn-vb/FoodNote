import type {
  CreateSavedMealRequest,
  MealItem as ContractMealItem,
  MealSource,
} from '@foodnote/shared';
import type { MealColumns, MealItemColumns } from './meal-columns';

/**
 * The contract ⇄ columns mapping shared by the meals and saved-meals endpoints.
 *
 * Both write the identical meal and item shape (see `meal-columns.ts`) into two
 * table pairs, and the two directions here are exactly where hand-kept copies
 * would quietly disagree: the fan-out of one `per100g` object into four
 * columns, and the rule that collapses them back into one or into null.
 *
 * Pure functions rather than a shared base service: the two services own
 * different aggregates and nothing else about them is common — only this
 * translation is. `MealsService` composes the occasion (`mealType`,
 * `recordedAt`) on top, exactly as `createMealRequestSchema` does over
 * `createSavedMealRequestSchema`.
 */

/** The fields a create body sets on a meal row, occasion aside. */
type MealFields = Pick<
  CreateSavedMealRequest,
  'mealName' | 'totalCalories' | 'proteinGrams' | 'carbsGrams' | 'fatGrams'
> & { source: MealSource };

export function toMealColumns(data: MealFields): MealFields {
  return {
    mealName: data.mealName,
    totalCalories: data.totalCalories,
    proteinGrams: data.proteinGrams,
    carbsGrams: data.carbsGrams,
    fatGrams: data.fatGrams,
    source: data.source,
  };
}

/**
 * The column values for one item. The parent link is the caller's to add — it
 * is the one thing that differs between `meal_items` and `saved_meal_items`.
 */
export function toItemColumns(
  item: ContractMealItem,
): Omit<MealItemColumns, 'id'> {
  return {
    name: item.name,
    quantityDescription: item.quantityDescription,
    portionGrams: item.portionGrams,
    caloriesPer100g: item.per100g?.calories ?? null,
    proteinGramsPer100g: item.per100g?.proteinGrams ?? null,
    carbsGramsPer100g: item.per100g?.carbsGrams ?? null,
    fatGramsPer100g: item.per100g?.fatGrams ?? null,
  };
}

/**
 * The contract item a stored row carries. `per100g` is reported only when all
 * four densities are present: they are written and cleared together (ADR-0011),
 * so a partly-filled row is a bug, and answering with a Nutrition Density that
 * is missing a macro would hand that bug to the client as a valid figure.
 */
export function toContractItem(row: MealItemColumns): ContractMealItem {
  return {
    name: row.name,
    quantityDescription: row.quantityDescription,
    portionGrams: row.portionGrams,
    per100g:
      row.caloriesPer100g !== null &&
      row.proteinGramsPer100g !== null &&
      row.carbsGramsPer100g !== null &&
      row.fatGramsPer100g !== null
        ? {
            calories: row.caloriesPer100g,
            proteinGrams: row.proteinGramsPer100g,
            carbsGrams: row.carbsGramsPer100g,
            fatGrams: row.fatGramsPer100g,
          }
        : null,
  };
}

/**
 * The response fields a Meal Entry and a Saved Meal answer with alike — the
 * whole of a SavedMealResponse, and a MealResponse but for its occasion. The
 * mirror of `savedMealResponseSchema = mealResponseSchema.omit(OCCASION_FIELDS)`.
 *
 * Items are echoed as an array (empty when there is no breakdown) and never
 * summed: the totals are the source of truth (ADR-0008).
 */
export function toMealFields(
  row: MealColumns & { items?: MealItemColumns[] },
): MealFields & { id: string; items: ContractMealItem[] } {
  return {
    id: row.id,
    ...toMealColumns(row),
    items: (row.items ?? []).map(toContractItem),
  };
}
