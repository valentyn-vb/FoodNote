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
  /** Epoch ms. A real time axis, so a week of elapsed time reads as a week. */
  t: number;
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

// Recharts calls tick/label formatters with placeholder values during layout,
// so both of these render a non-finite input as empty rather than throwing
// RangeError and taking the dashboard down with it.

/** An x-axis tick: "Jul". The trend spans months, so months are the unit. */
export function formatTrendTick(t: number): string {
  if (!Number.isFinite(t)) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(t));
}

/** A tooltip heading: "Jul 27" in UTC, matching Tracking Day. */
export function formatTrendDate(t: number): string {
  if (!Number.isFinite(t)) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(t));
}

/**
 * First-of-month tick positions across a series' span.
 *
 * Letting Recharts auto-tick a time axis puts ticks at arbitrary epochs, so the
 * labels landed on whatever dates entries happened to exist ("Jun 20", "Jul 28")
 * — a tick position that encodes nothing. Month boundaries are regular and
 * mean something. Falls back to the endpoints when a span is too short to
 * contain two boundaries (a reached target with under a month of entries).
 */
export function monthTicks(points: WeightTrendPoint[]): number[] {
  const first = points.at(0)?.t;
  const last = points.at(-1)?.t;
  if (first === undefined || last === undefined) return [];

  const ticks: number[] = [];
  const start = new Date(first);
  let t = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1);
  if (t < first) {
    t = Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1);
  }
  while (t <= last) {
    ticks.push(t);
    const cursor = new Date(t);
    t = Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1);
  }

  return ticks.length >= 2 ? ticks : [first, last];
}

/**
 * Weight-trend series on a true time axis: one point per Tracking Day, plus a
 * two-point projection from the newest entry to the target at the Projected
 * Goal Date. A reached target (null projectedGoalDate) shows logged points only.
 *
 * Deliberately not bucketed into "N weeks ago" categories (#68). Even category
 * spacing drew the Now→goal-date segment — routinely months — as wide as one
 * week, exaggerating the projected slope into a cliff, and the `1w ago` bucket
 * spanned `[now-7d, now)` so it re-plotted today's entry as a second point.
 *
 * One point per day matters because the journal is append-only and allows any
 * number of entries per day (ADR-0004). Plotting each of them put two weights
 * at effectively one instant, drawing a vertical segment — a claim that the
 * user weighed two things at once. The day's *last* entry wins, so the final
 * point equals Current Weight and the chart agrees with the tile above it.
 */
export function buildWeightTrend(
  weights: WeightEntryResponse[],
  goal: GoalBlock,
  now: Date,
): WeightTrendPoint[] {
  const latestPerDay = new Map<string, WeightEntryResponse>();
  for (const w of [...weights].sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt),
  )) {
    latestPerDay.set(utcDay(w.recordedAt), w); // ascending, so the last wins
  }

  const points: WeightTrendPoint[] = [...latestPerDay.values()].map((w) => ({
    t: Date.parse(w.recordedAt),
    actual: w.weightKg,
  }));

  if (!goal.projectedGoalDate) return points;

  // Anchor the projection on the newest logged point so the dashed line
  // continues the solid one instead of starting beside it. With no entries in
  // the window, fall back to the server's Current Weight at now.
  const anchor = points.at(-1);
  if (anchor) anchor.projected = anchor.actual;
  else points.push({ t: now.getTime(), projected: goal.currentWeightKg });

  points.push({
    t: Date.parse(`${goal.projectedGoalDate}T00:00:00Z`),
    projected: goal.targetWeightKg,
  });

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
