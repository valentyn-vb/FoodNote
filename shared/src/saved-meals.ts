import { z } from 'zod';
import { createMealRequestSchema, mealResponseSchema } from './meals';

/**
 * Saved Meal contract. A meal the user keeps by name to log again — the same
 * shape as a Meal Entry minus the two fields that describe an occasion rather
 * than the food: `mealType` and `recordedAt`. Both are chosen when it is
 * logged, exactly as with a Parsed Meal.
 *
 * `source` stays: it records how the kept numbers were produced, and logging
 * copies it, so a template built from a parse still reads as `ai`.
 *
 * Derived from the meal schemas rather than restated, which is what makes the
 * property the whole feature rests on hold by construction:
 * `{ ...savedMeal, mealType, recordedAt }` is a valid CreateMealRequest, so
 * logging a Saved Meal is a spread and not a mapping that can drift.
 *
 * Logging copies; it never links. A Meal Entry carries no reference back to the
 * Saved Meal it came from, so editing or deleting either one leaves the other
 * untouched — see ADR-0014.
 */

// Named because it is the whole distinction between the two records, and both
// schemas below have to omit exactly the same pair.
const OCCASION_FIELDS = { mealType: true, recordedAt: true } as const;

export const createSavedMealRequestSchema =
  createMealRequestSchema.omit(OCCASION_FIELDS);

/** PATCH accepts any subset; `items`, when present, replaces the whole list. */
export const updateSavedMealRequestSchema =
  createSavedMealRequestSchema.partial();

export const savedMealResponseSchema = mealResponseSchema.omit(OCCASION_FIELDS);

export const listSavedMealsResponseSchema = z.array(savedMealResponseSchema);

/**
 * The food half of a meal: what a Saved Meal keeps, with the occasion dropped.
 *
 * The schema does the projecting, so there is no field list to drift — a field
 * added to a meal is kept or omitted by `OCCASION_FIELDS` alone. It replaces
 * three hand-written copies of the same seven assignments, one of which was an
 * implicit reliance on the request parse stripping `id` on its way out.
 */
export function savedMealFrom(
  meal: CreateSavedMealRequest,
): CreateSavedMealRequest {
  return createSavedMealRequestSchema.parse(meal);
}

export type CreateSavedMealRequest = z.infer<
  typeof createSavedMealRequestSchema
>;
export type UpdateSavedMealRequest = z.infer<
  typeof updateSavedMealRequestSchema
>;
export type SavedMealResponse = z.infer<typeof savedMealResponseSchema>;
export type ListSavedMealsResponse = z.infer<
  typeof listSavedMealsResponseSchema
>;
