import { zodTextFormat } from 'openai/helpers/zod';
import type { ParsedResponse } from 'openai/resources/responses/responses';
import { z } from 'zod';
import { caloriesSchema, macroGramsSchema } from '@foodnote/shared';

/**
 * Deliberately not `aiParseResponseSchema`: strict Structured Outputs forbid a
 * root-level `anyOf`, so the union hides under one `result` key and is mapped
 * onto the wire contract in `toResult`. Numeric bounds come from shared/ so they
 * cannot drift; string lengths are absent because strict mode rejects
 * minLength/maxLength — `toResult`'s re-validation enforces those.
 */
const wholeCaloriesSchema = caloriesSchema.multipleOf(1);

const modelItemSchema = z.object({
  name: z.string(),
  quantityDescription: z.string(),
  // The model always estimates a weight and a density; both are required here.
  // Per-portion figures are intentionally absent — deriving them from the model
  // would give a third thing to reconcile with the item-level density and the
  // meal-level totals constraint (see prompt in constants.ts).
  portionGrams: z.number().positive(),
  per100g: z.object({
    calories: wholeCaloriesSchema,
    proteinGrams: macroGramsSchema,
    carbsGrams: macroGramsSchema,
    fatGrams: macroGramsSchema,
  }),
});

export const modelOutputSchema = z.object({
  result: z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('meal'),
      mealName: z.string(),
      items: z.array(modelItemSchema).min(1),
      // Spelled out, not spread from macroTotalsSchema.shape: a spread widens
      // this branch to Record<string, unknown> and costs the union its narrowing.
      totalCalories: wholeCaloriesSchema,
      proteinGrams: macroGramsSchema,
      carbsGrams: macroGramsSchema,
      fatGrams: macroGramsSchema,
      confidenceNote: z.string(),
    }),
    z.object({
      kind: z.literal('notFood'),
      reason: z.string(),
    }),
  ]),
});

/** Derived once at import — zodTextFormat rebuilds a parser closure per call. */
export const MEAL_PARSE_FORMAT = zodTextFormat(modelOutputSchema, 'meal_parse');

export type ParsedModelResponse = ParsedResponse<
  z.infer<typeof modelOutputSchema>
>;
