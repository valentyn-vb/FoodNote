import { z } from 'zod';
import {
  caloriesSchema,
  dateSchema,
  idSchema,
  macroGramsSchema,
  macroTotalsSchema,
  mealSourceSchema,
  mealTypeSchema,
  recordedAtSchema,
} from './common';

/**
 * Meal contract. The entry-level totals are the source of truth; items are
 * an optional breakdown (empty for manual entries, filled from a confirmed
 * AI parse) and the server never checks that they sum to the totals — the
 * user may adjust only the total after an AI parse.
 *
 * PATCH accepts any subset of the create fields; when `items` is present it
 * replaces the whole list (no per-item endpoints).
 */

export const mealItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  quantityDescription: z.string().trim().min(1).max(100),
  calories: caloriesSchema,
  proteinGrams: macroGramsSchema,
  carbsGrams: macroGramsSchema,
  fatGrams: macroGramsSchema,
});

export const createMealRequestSchema = z.object({
  mealName: z.string().trim().min(1).max(200),
  mealType: mealTypeSchema,
  recordedAt: recordedAtSchema,
  ...macroTotalsSchema.shape,
  source: mealSourceSchema,
  items: z.array(mealItemSchema).optional(),
});

export const updateMealRequestSchema = createMealRequestSchema.partial();

export const mealResponseSchema = z.object({
  id: idSchema,
  mealName: z.string(),
  mealType: mealTypeSchema,
  recordedAt: recordedAtSchema,
  ...macroTotalsSchema.shape,
  source: mealSourceSchema,
  items: z.array(mealItemSchema),
});

/** GET /meals?from=YYYY-MM-DD&to=YYYY-MM-DD — inclusive UTC-day bounds. */
export const listMealsQuerySchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});

export const listMealsResponseSchema = z.array(mealResponseSchema);

export type MealItem = z.infer<typeof mealItemSchema>;
export type CreateMealRequest = z.infer<typeof createMealRequestSchema>;
export type UpdateMealRequest = z.infer<typeof updateMealRequestSchema>;
export type MealResponse = z.infer<typeof mealResponseSchema>;
export type ListMealsQuery = z.infer<typeof listMealsQuerySchema>;
export type ListMealsResponse = z.infer<typeof listMealsResponseSchema>;

/**
 * POST /meals/ai-parse. "Not food" is a successful recognition outcome, not
 * an error: the response is a discriminated union on `parsed`. Real failures
 * stay HTTP errors — 400 (bad description), 429 (rate limit), 502 (OpenAI
 * failure / invalid JSON after retry).
 *
 * The parsed meal deliberately reuses the meal field names
 * (quantityDescription, proteinGrams, …) so a confirmed preview passes
 * straight into POST /meals with source: 'ai'.
 */

export const aiParseRequestSchema = z.object({
  description: z.string().trim().min(3).max(500),
});

export const aiParsedMealSchema = z.object({
  mealName: z.string(),
  items: z.array(mealItemSchema).min(1),
  ...macroTotalsSchema.shape,
  confidenceNote: z.string(),
});

export const aiParseResponseSchema = z.discriminatedUnion('parsed', [
  z.object({ parsed: z.literal(true), meal: aiParsedMealSchema }),
  z.object({ parsed: z.literal(false), reason: z.string() }),
]);

export type AiParseRequest = z.infer<typeof aiParseRequestSchema>;
export type AiParsedMeal = z.infer<typeof aiParsedMealSchema>;
export type AiParseResponse = z.infer<typeof aiParseResponseSchema>;
