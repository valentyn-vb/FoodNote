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

/**
 * Medical ceiling on weekly weight change, and the top preset (see ADR-0002).
 * Lives with Pace rather than in calc because it is a property of the value,
 * not of the arithmetic — and paceSchema needs it as its upper bound.
 */
export const MAX_SAFE_PACE_KG = 1.0;

/**
 * Weekly weight-change rate in kg/week. `0` is the maintenance plan — Pace is
 * the single thing that says what kind of plan a Goal is, so a Goal is
 * maintenance when, and only when, its pace is 0 (see docs/adr/0006). Non-zero
 * values are magnitudes; direction comes from targetWeightKg vs startWeightKg.
 *
 * Any rate in range, not just the presets below: a manual plan's rate is derived
 * from the calories the user typed, so it lands anywhere between 0 and the
 * ceiling (see docs/adr/0009, which amends ADR-0002's frozen set). The goals
 * column is `numeric(6,4)`, so a rate carries four decimals —
 * paceForCalorieTarget rounds to match, which is what makes a manual budget come
 * back as the number the user typed rather than a few kcal off it.
 */
export const paceSchema = z.number().min(0).max(MAX_SAFE_PACE_KG);

// The paces the picker offers, listed explicitly now that paceSchema is a range
// rather than a literal union. 0 is what puts "maintain" in it; 1.0 doubles as
// the safety ceiling. Presets are a shortcut, not the whole domain of Pace.
export const PACE_OPTIONS = [0, 0.25, 0.5, 0.75, MAX_SAFE_PACE_KG];

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
  // Null once the target is reached, and always null on a maintenance plan
  // (pace 0) — there is no date to project when there is nowhere to go.
  projectedGoalDate: dateSchema.nullable(),
  // Derived on read: the target has been met. Always false on a maintenance
  // plan. See hasReachedTarget in calc.
  reachedTarget: z.boolean(),
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
