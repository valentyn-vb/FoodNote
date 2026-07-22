import { z } from 'zod';
import { caloriesSchema, dateSchema, idSchema, weightKgSchema } from './common';

/**
 * Goal contract. At most one goal is active per user: POST always creates a
 * new active goal and marks the previous active one `replaced` (no 409).
 * GET /goals/current returns 404 when there is no active goal — the signal
 * that onboarding is not complete.
 *
 * startWeightKg / startDate are set by the server at creation and immutable;
 * projectedGoalDate is derived on read (remaining weight ÷ pace).
 */

export const paceSchema = z.literal([0.25, 0.5, 0.75, 1.0]);

// The four preset paces, derived from the schema so the values live in one
// place. Used by both apps to render the pace picker. 1.0 is also the safety
// ceiling (MAX_SAFE_PACE_KG in calc) — see docs/adr/0002.
export const PACE_OPTIONS = [...paceSchema.values];

export const goalStatusSchema = z.enum(['active', 'completed', 'replaced']);

export const createGoalRequestSchema = z.object({
  targetWeightKg: weightKgSchema,
  preferredWeeklyChangeKg: paceSchema,
});

export const updateGoalRequestSchema = createGoalRequestSchema.partial();

export const goalResponseSchema = z.object({
  id: idSchema,
  startWeightKg: weightKgSchema,
  targetWeightKg: weightKgSchema,
  preferredWeeklyChangeKg: paceSchema,
  startDate: dateSchema,
  // Null when the target is already reached at the current weight.
  projectedGoalDate: dateSchema.nullable(),
  status: goalStatusSchema,
});

export type Pace = z.infer<typeof paceSchema>;
export type GoalStatus = z.infer<typeof goalStatusSchema>;
export type CreateGoalRequest = z.infer<typeof createGoalRequestSchema>;
export type UpdateGoalRequest = z.infer<typeof updateGoalRequestSchema>;
export type GoalResponse = z.infer<typeof goalResponseSchema>;

/**
 * A single viable plan shown during onboarding, one per Pace, before a Goal
 * exists. Computed by the shared calc module; options whose loss target would
 * fall below the safety floor are omitted entirely (see docs/adr/0002).
 * dailyEnergyDelta is the magnitude of the daily deficit (loss) or surplus
 * (gain).
 */
export const planOptionSchema = z.object({
  pace: paceSchema,
  dailyCalorieTarget: caloriesSchema,
  dailyEnergyDelta: caloriesSchema,
  projectedGoalDate: dateSchema.nullable(),
});

export type PlanOption = z.infer<typeof planOptionSchema>;
