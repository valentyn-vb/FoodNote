import type {
  DashboardResponse,
  MealResponse,
  MealType,
  WeightEntryResponse,
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

/** Avatar initials from an email local-part: "jamie.rivera@…" → "JR". */
export function emailInitials(email: string): string {
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((p) => p[0]);
  return (initials.join('') || local[0] || '?').toUpperCase();
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

/** One Tracking Day's meals, newest first (matches optimistic prepend order). */
export function todaysMeals(
  meals: MealResponse[],
  date: string,
): MealResponse[] {
  return meals
    .filter((m) => utcDay(m.recordedAt) === date)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

/**
 * Seven daily calorie totals ending today, oldest → newest, labelled by
 * weekday. Days with no meals are honest zero bars. "Yesterday" is the
 * second-to-last bucket.
 */
export function bucketDailyCalories(
  meals: MealResponse[],
  now: Date,
): DailyCaloriePoint[] {
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  });
  const baseMs = Date.parse(`${todayUtc(now)}T00:00:00Z`);

  return Array.from({ length: 7 }, (_, idx) => {
    const dayMs = baseMs - (6 - idx) * DAY_MS;
    const date = new Date(dayMs).toISOString().slice(0, 10);
    const kcal = meals
      .filter((m) => utcDay(m.recordedAt) === date)
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
export function computeWeightChange(
  weights: WeightEntryResponse[],
  currentWeightKg: number,
  now: Date,
): { weightChangeKg: number; weightChangeLastMonthKg: number } {
  const sorted = [...weights].sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt),
  );
  const weightAtOrBefore = (targetMs: number): number | undefined => {
    let found: number | undefined;
    for (const w of sorted) {
      if (Date.parse(w.recordedAt) <= targetMs) found = w.weightKg;
      else break;
    }
    return found;
  };

  const w30 = weightAtOrBefore(now.getTime() - 30 * DAY_MS);
  const w60 = weightAtOrBefore(now.getTime() - 60 * DAY_MS);

  return {
    weightChangeKg: w30 === undefined ? 0 : round1(currentWeightKg - w30),
    weightChangeLastMonthKg:
      w30 === undefined || w60 === undefined ? 0 : round1(w30 - w60),
  };
}
