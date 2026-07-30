import type { ActivityLevel, Sex } from './common';
import type { BodyMetrics, GoalProgress, PlanInput } from './calc.types';
import type { Pace, PlanOption } from './goals';
import { MAX_SAFE_PACE_KG, PACE_OPTIONS } from './goals';

/**
 * Pure calorie-planning math — Mifflin-St Jeor BMR, TDEE, pace deficits, the
 * safety floor, and plan-option assembly. No HTTP, no DB. Shared so the backend
 * (profile/dashboard read-time recompute) and the frontend (onboarding plan
 * preview) run the identical numbers. See docs/adr/0001, docs/adr/0002.
 *
 * Types live in ./calc.types; internals carry full float precision, only
 * user-facing kcal outputs round.
 */

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
 * The weekly rate a chosen daily calorie budget implies — the inverse of
 * `calorieTargetForPace`, for a manual plan where the user names the calories
 * and the rate, and so the Projected Goal Date, follows from them.
 *
 * Returns a magnitude, like Pace itself: direction stays with the Goal, so the
 * distance from Maintenance Calories is measured in the goal's own direction.
 * Eating on the wrong side of maintenance for that direction gives 0, which is
 * the honest reading of "these calories will not move you toward your target" —
 * and pace 0 is already a maintenance plan with no projected date (ADR-0006), so
 * no new branch is needed anywhere downstream.
 *
 * Rounded to the four decimals the `goals` column stores, so the rate previewed
 * next to the input is the one saved and served back — and so the budget the user
 * typed comes back as itself.
 *
 * Four is not cosmetic. One step of Pace is worth `step × 7700 ÷ 7` kcal/day, so
 * 2dp put the achievable targets on an 11 kcal grid and a typed 1,600 came back as
 * 1,596. 4dp makes the step 0.11 kcal, well inside the ±0.5 that whole-kcal
 * rounding absorbs, so `calorieTargetForPace` round-trips a manual budget exactly.
 */
export function paceForCalorieTarget(
  input: PlanInput,
  dailyKcal: number,
): number {
  const maintenance = tdee(
    {
      age: input.age,
      sex: input.sex,
      heightCm: input.heightCm,
      weightKg: input.currentWeightKg,
    },
    input.activityLevel,
  );
  const towardTarget =
    input.targetWeightKg > input.currentWeightKg
      ? dailyKcal - maintenance // gain: the surplus
      : maintenance - dailyKcal; // loss, or equal weights: the deficit
  const pace = (towardTarget * 7) / KCAL_PER_KG;

  return (
    Math.round(Math.min(Math.max(pace, 0), MAX_SAFE_PACE_KG) * 10000) / 10000
  );
}

/**
 * The daily calorie budgets a manual plan may name, in the goal's own direction:
 * never below the Safety Floor, never further from Maintenance Calories than the
 * safety ceiling allows, and never past maintenance on the wrong side — that
 * would be a plan moving away from its own target.
 *
 * Shared so the form's field bounds and the plan it saves come from one place,
 * and so a user can never ask for a number the floor would silently overrule.
 * Both bounds are floored, so the range is never inverted even for a body whose
 * bare maintenance already sits under the floor.
 */
export function manualCalorieRange(input: PlanInput): {
  min: number;
  max: number;
} {
  const maintenance = Math.round(
    tdee(
      {
        age: input.age,
        sex: input.sex,
        heightCm: input.heightCm,
        weightKg: input.currentWeightKg,
      },
      input.activityLevel,
    ),
  );
  const ceiling = Math.round(dailyEnergyDeltaForPace(MAX_SAFE_PACE_KG));
  const floor = SAFETY_FLOOR[input.sex];
  const isGain = input.targetWeightKg > input.currentWeightKg;

  return {
    min: Math.max(isGain ? maintenance : maintenance - ceiling, floor),
    max: Math.max(isGain ? maintenance + ceiling : maintenance, floor),
  };
}

/**
 * Date the target is reached: `fromDate` + ceil(remaining ÷ weekly pace, in
 * days). `remainingKg` is a magnitude (direction-agnostic); returns null when
 * nothing remains. Uses UTC throughout so the result never depends on a client
 * timezone — the same rule the rest of the contract follows.
 *
 * A pace of 0 is a maintenance plan and has no projected date. The guard is
 * load-bearing, not defensive: dividing by 0 gives Infinity days, which makes
 * an Invalid Date whose toISOString() throws RangeError.
 */
export function projectedDate(
  remainingKg: number,
  weeklyPaceKg: number,
  fromDate: string,
): string | null {
  if (weeklyPaceKg <= 0) return null;
  if (remainingKg <= 0) return null;
  const days = Math.ceil((remainingKg / weeklyPaceKg) * 7);
  const from = new Date(`${fromDate}T00:00:00.000Z`);
  from.setUTCDate(from.getUTCDate() + days);
  return from.toISOString().slice(0, 10);
}

/**
 * Whether the Goal's target has been met at `currentWeightKg`.
 *
 * Direction comes from target vs **start** weight, never vs current: once the
 * user overshoots, the current weight sits on the far side of the target, so
 * comparing against current would read a passed loss goal as a gain goal still
 * to come. `projectedDate` works on a magnitude and cannot make that
 * distinction, which is why this is its own test and not
 * `projectedGoalDate === null`.
 *
 * Always false on a maintenance plan (pace 0) — there is no target to reach, and
 * a permanently-true flag would pin the dashboard's reached prompt open forever.
 */
export function hasReachedTarget({
  startWeightKg,
  targetWeightKg,
  currentWeightKg,
  preferredWeeklyChangeKg,
}: GoalProgress): boolean {
  if (preferredWeeklyChangeKg === 0) return false;
  return targetWeightKg < startWeightKg
    ? currentWeightKg <= targetWeightKg
    : currentWeightKg >= targetWeightKg;
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

  // A loss option is hidden when its unclamped target would dip below the
  // floor; gain and maintenance options are always viable. Keep the viable
  // paces, then map each to a full option.
  const isViable = (pace: Pace): boolean =>
    !isLoss ||
    maintenance - dailyEnergyDeltaForPace(pace) >= SAFETY_FLOOR[input.sex];

  return PACE_OPTIONS.filter(isViable).map((pace) => ({
    pace,
    dailyCalorieTarget: calorieTargetForPace(input, pace),
    dailyEnergyDelta: Math.round(dailyEnergyDeltaForPace(pace)),
    projectedGoalDate: projectedDate(remainingKg, pace, input.fromDate),
  }));
}
