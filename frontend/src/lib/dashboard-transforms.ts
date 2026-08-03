import {
  mealTypeSchema,
  type DashboardResponse,
  type MealResponse,
  type MealType,
  type WeightEntryResponse,
} from '@foodnote/shared';

/**
 * Pure presentation transforms for the dashboard. Per ADR-0005 the chart
 * series are NOT served by the API — the client assembles them here from the
 * Meal Entry and Weight Entry journals plus the Dashboard's goal block. Kept
 * side-effect-free (time is always passed in) so the shapes are easy to reason
 * about and the daily-boundary rules stay explicit.
 *
 * All daily bucketing uses the UTC calendar day, matching the contract
 * (see common.ts / the "Tracking Day" glossary entry).
 */

const DAY_MS = 86_400_000;

export type WeightTrendPoint = {
  label: string;
  actual?: number;
  projected?: number;
};

export type DailyCaloriePoint = { day: string; kcal: number };

/** The UTC calendar day ('YYYY-MM-DD') an ISO instant falls on. */
export function utcDay(iso: string): string {
  return iso.slice(0, 10);
}

/** Today as a UTC 'YYYY-MM-DD' string — the same rule the backend uses. */
export function todayUtc(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** A UTC 'YYYY-MM-DD' string `days` days before `now` — for range `from` bounds. */
export function isoDaysAgo(days: number, now: Date): string {
  return new Date(now.getTime() - days * DAY_MS).toISOString().slice(0, 10);
}

/** Add (or subtract) `days` to a UTC 'YYYY-MM-DD' string. */
export function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** True when `isoDate` is strictly after today UTC. */
export function isFutureDay(isoDate: string, now: Date): boolean {
  return isoDate > todayUtc(now);
}

/**
 * Human label for a tracking day:
 * - same UTC day as `now` → "Today"
 * - one day before → "Yesterday"
 * - otherwise → locale short date, e.g. "Mon, Jul 28"
 */
export function formatDayLabel(isoDate: string, now: Date): string {
  const today = todayUtc(now);
  if (isoDate === today) return 'Today';
  if (isoDate === addDays(today, -1)) return 'Yesterday';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Meal type inferred from the local hour, since the drawer never asks (#34). */
export function mealTypeForHour(hour: number): MealType {
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

/** Projected goal date as "Sep 19" (UTC). */
export function formatGoalDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

/** Whole weeks from `now` until a goal date (never negative). */
export function weeksUntil(date: string, now: Date): number {
  const diff = Date.parse(`${date}T00:00:00Z`) - now.getTime();
  return Math.max(0, Math.ceil(diff / (7 * DAY_MS)));
}

/** A logged-at label for a meal row, in the viewer's local time ("12:40 PM"). */
export function formatMealTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** A weight entry's logged-at label, in the viewer's local time ("Jul 27, 3:06 PM"). */
export function formatEntryDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

// <input type="datetime-local"> has no timezone of its own — it's read/written
// in the browser's local time, matching formatEntryDate's display above.
export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** One Tracking Day's meals, newest first (matches optimistic prepend order). */
export function todaysMeals(
  meals: MealResponse[],
  date: string,
): MealResponse[] {
  return meals
    .filter((m) => utcDay(m.recordedAt) === date)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

export type MealGroup = {
  mealType: MealType;
  meals: MealResponse[];
  totalKcal: number;
};

/**
 * One day's meals split into the four meal times. Always returns all four
 * groups — an empty breakfast is information ("nothing logged"), not a group to
 * hide, and a fixed shape lets every layout render without null checks.
 *
 * Group order comes from mealTypeSchema.options (the contract's own order:
 * breakfast → lunch → dinner → snack) rather than a second hardcoded list that
 * could drift from it.
 *
 * Within a group meals run oldest → newest, so a group reads top-down in the
 * order it was eaten. Callers pass todaysMeals(), which is newest-first to match
 * the provider's optimistic prepend, so this re-sorts rather than inheriting it.
 */
export function groupMealsByType(meals: MealResponse[]): MealGroup[] {
  return mealTypeSchema.options.map((mealType) => {
    const inGroup = meals
      .filter((meal) => meal.mealType === mealType)
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));

    return {
      mealType,
      meals: inGroup,
      totalKcal: inGroup.reduce((sum, meal) => sum + meal.totalCalories, 0),
    };
  });
}

/** "420 kcal · 2 meals" — the subtotal line every group header shows. */
export function formatGroupSummary(group: MealGroup): string {
  const meals = `${group.meals.length} ${group.meals.length === 1 ? 'meal' : 'meals'}`;
  return `${group.totalKcal} kcal · ${meals}`;
}

/**
 * Seven daily calorie totals ending on `date`, oldest → newest, labelled by
 * weekday. Days with no meals are honest zero bars. "Yesterday" is the
 * second-to-last bucket.
 *
 * `date` is the Dashboard's Tracking Day, not the client clock, so the last
 * bucket is always the same day as the "Logged today" list (see todaysMeals).
 */
export function bucketDailyCalories(
  meals: MealResponse[],
  date: string,
): DailyCaloriePoint[] {
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  });
  const baseMs = Date.parse(`${date}T00:00:00Z`);

  return Array.from({ length: 7 }, (_, idx) => {
    const dayMs = baseMs - (6 - idx) * DAY_MS;
    const bucketDate = new Date(dayMs).toISOString().slice(0, 10);
    const kcal = meals
      .filter((m) => utcDay(m.recordedAt) === bucketDate)
      .reduce((sum, m) => sum + m.totalCalories, 0);
    return { day: weekday.format(new Date(dayMs)), kcal };
  });
}

type GoalBlock = Pick<
  DashboardResponse['goal'],
  'currentWeightKg' | 'targetWeightKg' | 'projectedGoalDate'
>;

/**
 * Weight-trend series: up to six rolling weekly buckets (latest entry in each
 * 7-day window, gaps allowed) ending at "Now" (the authoritative Current
 * Weight), plus a two-point projection line from Now to the target at the
 * Projected Goal Date. A fresh account (one entry) shows a single actual point
 * and the projection; a reached target (null projectedGoalDate) shows the
 * actual line only.
 */
export function buildWeightTrend(
  weights: WeightEntryResponse[],
  goal: GoalBlock,
  now: Date,
): WeightTrendPoint[] {
  const nowMs = now.getTime();
  const sorted = [...weights].sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt),
  );
  const points: WeightTrendPoint[] = [];

  for (let i = 6; i >= 1; i--) {
    const windowEnd = nowMs - (i - 1) * 7 * DAY_MS;
    const windowStart = nowMs - i * 7 * DAY_MS;
    const inWindow = sorted.filter((w) => {
      const t = Date.parse(w.recordedAt);
      return t >= windowStart && t < windowEnd;
    });
    const latest = inWindow.at(-1);
    points.push({
      label: `${i}w ago`,
      actual: latest?.weightKg,
    });
  }

  const nowPoint: WeightTrendPoint = {
    label: 'Now',
    actual: goal.currentWeightKg,
  };
  if (goal.projectedGoalDate) {
    // The projection continues from the current weight, so the dashed line
    // picks up exactly where the solid actual line ends.
    nowPoint.projected = goal.currentWeightKg;
  }
  points.push(nowPoint);

  if (goal.projectedGoalDate) {
    points.push({
      label: formatGoalDate(goal.projectedGoalDate),
      projected: goal.targetWeightKg,
    });
  }

  return points;
}

/**
 * Weight change over the last ~30 days and the ~30 days before that, using
 * carry-forward (the latest entry at or before each anchor). Not enough
 * history for a period → 0.0 kg, so a fresh account reads honestly.
 */
/**
 * The logged weight at or before `now - days` (carry-forward). Undefined when
 * no entry is that old yet — the shared primitive both functions below build
 * on, so the "how far back does history reach" check exists in one place.
 */
function weightDaysAgo(
  weights: WeightEntryResponse[],
  now: Date,
  days: number,
): number | undefined {
  const sorted = [...weights].sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt),
  );
  const targetMs = now.getTime() - days * DAY_MS;
  let found: number | undefined;
  for (const w of sorted) {
    if (Date.parse(w.recordedAt) <= targetMs) found = w.weightKg;
    else break;
  }
  return found;
}

/**
 * Weight change over the last `days`: current weight minus the weight `days`
 * ago. Null when no entry is that old yet — a fresh account has no 30-day
 * change to report, a different fact than "changed by 0". #70's period table
 * (3/7/14/30-day rows) renders null as "not enough history yet" rather than
 * a misleading 0.0 kg.
 */
export function changeOverDays(
  weights: WeightEntryResponse[],
  currentWeightKg: number,
  now: Date,
  days: number,
): number | null {
  const past = weightDaysAgo(weights, now, days);
  return past === undefined ? null : round1(currentWeightKg - past);
}

export function computeWeightChange(
  weights: WeightEntryResponse[],
  currentWeightKg: number,
  now: Date,
): { weightChangeKg: number; weightChangeLastMonthKg: number } {
  const w30 = weightDaysAgo(weights, now, 30);
  const w60 = weightDaysAgo(weights, now, 60);
  return {
    // This tile's existing "no history yet" reading is 0.0 kg, not a dash —
    // preserved as-is; changeOverDays' null is reserved for #70's table.
    weightChangeKg: w30 === undefined ? 0 : round1(currentWeightKg - w30),
    weightChangeLastMonthKg:
      w30 === undefined || w60 === undefined ? 0 : round1(w30 - w60),
  };
}
