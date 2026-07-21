import type { ActivityLevel, Sex } from './common';
import type { Pace, PlanOption } from './goals';
import { PACE_OPTIONS } from './goals';

/**
 * Pure calorie-planning math — Mifflin-St Jeor BMR, TDEE, pace deficits, the
 * safety floor, and plan-option assembly. No HTTP, no DB. Shared so the backend
 * (profile/dashboard read-time recompute) and the frontend (onboarding plan
 * preview) run the identical numbers. See docs/adr/0001, docs/adr/0002.
 *
 * Internals carry full float precision; only user-facing kcal outputs round.
 */

export interface BodyMetrics {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
}

/**
 * Basal Metabolic Rate via Mifflin-St Jeor, returned unrounded so callers can
 * compose without compounding rounding error.
 */
export function bmr({ age, sex, heightCm, weightKg }: BodyMetrics): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

/** Standard Mifflin-St Jeor activity multipliers (see CONTEXT.md). */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

/** Total Daily Energy Expenditure — maintenance energy, unrounded. */
export function tdee(
  metrics: BodyMetrics,
  activityLevel: ActivityLevel,
): number {
  return bmr(metrics) * ACTIVITY_FACTORS[activityLevel];
}

/** Energy density of body mass, kcal per kg. */
export const KCAL_PER_KG = 7700;

/** Medical ceiling on weekly weight change — also the top preset (see ADR-0002). */
export const MAX_SAFE_PACE_KG = 1.0;

/**
 * Daily kcal to add/subtract from maintenance to move at `pace` kg/week.
 * Magnitude only — direction is applied by the caller.
 */
export function dailyEnergyDeltaForPace(pace: Pace): number {
  if (pace > MAX_SAFE_PACE_KG) {
    throw new RangeError(
      `pace ${pace} kg/week exceeds the ${MAX_SAFE_PACE_KG} safety ceiling`,
    );
  }
  return (pace * KCAL_PER_KG) / 7;
}

/** Lowest calorie target ever offered, by sex. Loss-side only. */
export const SAFETY_FLOOR: Record<Sex, number> = { female: 1200, male: 1500 };

/** A user's profile plus the goal endpoints the plan math needs. */
export interface PlanInput {
  age: number;
  sex: Sex;
  heightCm: number;
  activityLevel: ActivityLevel;
  currentWeightKg: number;
  targetWeightKg: number;
}

/**
 * Recommended daily calorie target for a chosen pace, rounded to whole kcal.
 * Direction comes from target vs. current weight: loss subtracts the deficit
 * (and clamps up to the sex safety floor), gain adds the surplus, maintenance
 * (equal weights) returns maintenance. The floor never affects gain.
 */
export function calorieTargetForPace(input: PlanInput, pace: Pace): number {
  const maintenance = tdee(
    {
      age: input.age,
      sex: input.sex,
      heightCm: input.heightCm,
      weightKg: input.currentWeightKg,
    },
    input.activityLevel,
  );
  const delta = dailyEnergyDeltaForPace(pace);

  if (input.targetWeightKg < input.currentWeightKg) {
    const target = maintenance - delta;
    return Math.round(Math.max(target, SAFETY_FLOOR[input.sex]));
  }
  if (input.targetWeightKg > input.currentWeightKg) {
    return Math.round(maintenance + delta);
  }
  return Math.round(maintenance);
}

/**
 * Date the target is reached: `fromDate` + ceil(remaining ÷ weekly pace, in
 * days). `remainingKg` is a magnitude (direction-agnostic); returns null when
 * nothing remains. Uses UTC throughout so the result never depends on a client
 * timezone — the same rule the rest of the contract follows.
 */
export function projectedDate(
  remainingKg: number,
  weeklyPaceKg: number,
  fromDate: string,
): string | null {
  if (remainingKg <= 0) return null;
  const days = Math.ceil((remainingKg / weeklyPaceKg) * 7);
  const from = new Date(`${fromDate}T00:00:00.000Z`);
  from.setUTCDate(from.getUTCDate() + days);
  return from.toISOString().slice(0, 10);
}

/**
 * Every viable plan option for a goal, one per preset Pace. Loss options whose
 * target would fall below the safety floor are omitted entirely (not clamped),
 * so every returned option's target is honest at its nominal pace. Gain and
 * maintenance options are never hidden. Used by onboarding to preview plans
 * before a Goal is saved.
 */
export function buildPlanOptions(
  input: PlanInput & { fromDate: string },
): PlanOption[] {
  const maintenance = tdee(
    {
      age: input.age,
      sex: input.sex,
      heightCm: input.heightCm,
      weightKg: input.currentWeightKg,
    },
    input.activityLevel,
  );
  const isLoss = input.targetWeightKg < input.currentWeightKg;
  const remainingKg = Math.abs(input.targetWeightKg - input.currentWeightKg);

  return PACE_OPTIONS.flatMap((pace: Pace) => {
    const delta = dailyEnergyDeltaForPace(pace);
    // Hide any loss option whose (unclamped) target dips below the floor.
    if (isLoss && maintenance - delta < SAFETY_FLOOR[input.sex]) {
      return [];
    }
    return [
      {
        pace,
        dailyCalorieTarget: calorieTargetForPace(input, pace),
        dailyEnergyDelta: Math.round(delta),
        projectedGoalDate: projectedDate(remainingKg, pace, input.fromDate),
      },
    ];
  });
}
