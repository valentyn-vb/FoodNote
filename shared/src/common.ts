import { z } from 'zod';

/**
 * Cross-cutting contract pieces: enums, bounded numeric fields, and the
 * error envelope. Every field carrying a unit spells it in its name
 * (weightKg, heightCm, proteinGrams); calories are always kcal.
 *
 * All daily boundaries (weight uniqueness, dashboard totals) use the UTC
 * calendar day of `recordedAt` — the API never deals in client timezones
 * (accepted MVP trade-off, see CONTRACT.md).
 */

export const sexSchema = z.enum(['male', 'female']);

export const activityLevelSchema = z.enum([
  'sedentary',
  'light',
  'moderate',
  'active',
  'veryActive',
]);

export const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);

export const mealSourceSchema = z.enum(['manual', 'ai']);

export type Sex = z.infer<typeof sexSchema>;
export type ActivityLevel = z.infer<typeof activityLevelSchema>;
export type MealType = z.infer<typeof mealTypeSchema>;
export type MealSource = z.infer<typeof mealSourceSchema>;

// Bounded field schemas, reused across resources.
export const idSchema = z.uuid();
export const ageSchema = z.number().int().min(13).max(100);
export const heightCmSchema = z.number().min(100).max(250);
export const weightKgSchema = z.number().min(30).max(300);
export const caloriesSchema = z.number().min(0).max(10000);
export const macroGramsSchema = z.number().min(0).max(1000);
export const recordedAtSchema = z.iso.datetime();
export const dateSchema = z.iso.date();

/** kcal + macro totals — the shape shared by meals, AI parses and dashboard. */
export const macroTotalsSchema = z.object({
  totalCalories: caloriesSchema,
  proteinGrams: macroGramsSchema,
  carbsGrams: macroGramsSchema,
  fatGrams: macroGramsSchema,
});

export type MacroTotals = z.infer<typeof macroTotalsSchema>;

/** NestJS default error envelope; clients branch on HTTP status. */
export const errorResponseSchema = z.object({
  statusCode: z.number(),
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string().optional(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
