import { z } from 'zod';
import {
  caloriesSchema,
  dateSchema,
  macroTotalsSchema,
  weightKgSchema,
} from './common';

/**
 * Dashboard contract — a thin read model: one UTC day's consumption against
 * the live-computed target, plus goal progress. Chart series come from the
 * resource endpoints (GET /weights, GET /meals) and are aggregated client-side.
 *
 * 404 until onboarding is complete (no profile or no active goal).
 */

/** GET /dashboard?date=YYYY-MM-DD — defaults to the current UTC day. */
export const dashboardQuerySchema = z.object({
  date: dateSchema.optional(),
});

export const dashboardResponseSchema = z.object({
  date: dateSchema,
  maintenanceCalories: caloriesSchema,
  calorieTarget: caloriesSchema,
  today: z.object({
    ...macroTotalsSchema.shape,
    mealsLogged: z.number().int().min(0),
  }),
  goal: z.object({
    startWeightKg: weightKgSchema,
    currentWeightKg: weightKgSchema,
    targetWeightKg: weightKgSchema,
    // Null when the target is already reached at the current weight.
    projectedGoalDate: dateSchema.nullable(),
  }),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;
