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
  /** Epoch ms. A real time axis, so a week of elapsed time reads as a week. */
  t: number;
  actual?: number;
  projected?: number;
  /** Least-squares fit through the actual readings — absent below two of them. */
  trend?: number;
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
  return utcWeekdayMonthDay.format(new Date(`${isoDate}T00:00:00Z`));
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

/**
 * The four label shapes this module formats dates in. Built once at module
 * scope: `Intl.DateTimeFormat` construction is the expensive half of formatting,
 * and the trend formatters run per axis tick and per tooltip render.
 *
 * The UTC pair is deliberate, not incidental — a Tracking Day is a UTC calendar
 * day (see the module header), so a date-only label has to be read in UTC or it
 * shifts by one day either side of midnight. The local pair is equally
 * deliberate: a *logged-at* timestamp is an instant, and the reader wants it in
 * the clock they were holding when they logged it.
 */
const utcMonth = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
});
const utcMonthDay = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const localTime = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});
const localMonthDayTime = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
const utcWeekdayMonthDay = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const utcWeekday = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  timeZone: 'UTC',
});

/** Projected goal date as "Sep 19" (UTC). */
export function formatGoalDate(date: string): string {
  return utcMonthDay.format(new Date(`${date}T00:00:00Z`));
}

/** A logged-at label for a meal row, in the viewer's local time ("12:40 PM"). */
export function formatMealTime(iso: string): string {
  return localTime.format(new Date(iso));
}

/** A weight entry's logged-at label, in the viewer's local time ("Jul 27, 3:06 PM"). */
export function formatEntryDate(iso: string): string {
  return localMonthDayTime.format(new Date(iso));
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
 * bucket is always the same day as the "Today's meals" list (see todaysMeals).
 */
export function bucketDailyCalories(
  meals: MealResponse[],
  date: string,
): DailyCaloriePoint[] {
  const baseMs = Date.parse(`${date}T00:00:00Z`);

  return Array.from({ length: 7 }, (_, idx) => {
    const dayMs = baseMs - (6 - idx) * DAY_MS;
    const bucketDate = new Date(dayMs).toISOString().slice(0, 10);
    const kcal = meals
      .filter((m) => utcDay(m.recordedAt) === bucketDate)
      .reduce((sum, m) => sum + m.totalCalories, 0);
    return { day: utcWeekday.format(new Date(dayMs)), kcal };
  });
}

type GoalBlock = Pick<
  DashboardResponse['goal'],
  'currentWeightKg' | 'targetWeightKg' | 'projectedGoalDate'
>;

// Recharts calls tick/label formatters with placeholder values during layout,
// so both of these render a non-finite input as empty rather than throwing
// RangeError and taking the dashboard down with it.

/**
 * An x-axis tick: "Jul" on a month boundary, "Jul 11" anywhere else.
 *
 * Months are the unit, and monthTicks puts every tick on the 1st — except when
 * a span holds fewer than two boundaries, where it falls back to the span's own
 * ends. Those are ordinary dates, and printing only their month labelled both
 * ends of a three-week journal "Jul".
 */
export function formatTrendTick(t: number): string {
  if (!Number.isFinite(t)) return '';
  const date = new Date(t);
  return date.getUTCDate() === 1
    ? utcMonth.format(date)
    : utcMonthDay.format(date);
}

/** A tooltip heading: "Jul 27" in UTC, matching Tracking Day. */
export function formatTrendDate(t: number): string {
  if (!Number.isFinite(t)) return '';
  return utcMonthDay.format(new Date(t));
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

  if (ticks.length >= 2) return ticks;
  // One tick, not two of the same: a window holding a single weigh-in has
  // first === last, and recharts keys a tick by its value and coordinate, so
  // the duplicate pair collided on both and React dropped one.
  return first === last ? [first] : [first, last];
}

/**
 * Ordinary least squares through `[x, y]` pairs, returned as the line itself.
 * Null below two points, and null when every x is the same instant — both are
 * cases where no single line is defined, rather than ones to draw flat.
 */
function fitLine(pairs: [number, number][]): ((x: number) => number) | null {
  if (pairs.length < 2) return null;

  const n = pairs.length;
  const meanX = pairs.reduce((sum, [x]) => sum + x, 0) / n;
  const meanY = pairs.reduce((sum, [, y]) => sum + y, 0) / n;

  let covariance = 0;
  let variance = 0;
  for (const [x, y] of pairs) {
    covariance += (x - meanX) * (y - meanY);
    variance += (x - meanX) ** 2;
  }
  if (variance === 0) return null;

  const slope = covariance / variance;
  return (x) => round1(meanY + slope * (x - meanX));
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
 *
 * Each reading also carries the least-squares line through all of them, which
 * is what the day-to-day noise of a bathroom scale hides: water weight moves a
 * reading by more than a week of a 0.5 kg/week plan does. The fit is over
 * instants, not over positions in the series — on this axis a gap in the
 * journal is real elapsed time, and a fit over positions would tilt the line by
 * however often the user happened to weigh in.
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

  const readings = [...latestPerDay.values()].map(
    (w) => [Date.parse(w.recordedAt), w.weightKg] as [number, number],
  );
  const fit = fitLine(readings);

  const points: WeightTrendPoint[] = readings.map(([t, weightKg]) => ({
    t,
    actual: weightKg,
    trend: fit?.(t),
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
 * The weight in effect at any past instant: the latest entry at or before it,
 * carried forward. Undefined when the journal starts after that instant — the
 * caller decides what "no history yet" reads as, since 0.0 kg of change and no
 * comparison at all are different statements.
 */
function carryForward(
  weights: WeightEntryResponse[],
): (atMs: number) => number | undefined {
  const sorted = [...weights].sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt),
  );

  return (atMs) => {
    let found: number | undefined;
    for (const w of sorted) {
      if (Date.parse(w.recordedAt) <= atMs) found = w.weightKg;
      else break;
    }
    return found;
  };
}

/**
 * Current Weight as of a given instant: the latest entry at or before it.
 *
 * The Dashboard is a read of one Tracking Day (CONTEXT.md), so every weight
 * figure on it has to be the weight *that day* — the server's Current Weight is
 * only ever the latest one, which on a past day is a number the user did not
 * have yet. It is still the right fallback when the journal reaches no further
 * back than the instant asked for: a day before the first weigh-in has no
 * weight of its own, and the alternative is a card with a hole in it.
 */
export function weightAsOf(
  weights: WeightEntryResponse[],
  at: Date,
  fallbackKg: number,
): number {
  return carryForward(weights)(at.getTime()) ?? fallbackKg;
}

/**
 * Weight change over the last `days` days, or null when the journal has nothing
 * that far back. Null rather than 0.0: on a fresh account "no change" would be
 * a claim the data doesn't support, and the card says so instead.
 *
 * A rolling window, not a calendar one — "since Monday" reads 0.0 every Monday
 * morning, and a fixed length is what makes this comparable to the Pace in
 * kg/week shown beside it.
 */
export function weightChangeOverDays(
  weights: WeightEntryResponse[],
  currentWeightKg: number,
  now: Date,
  days: number,
): number | null {
  const then = carryForward(weights)(now.getTime() - days * DAY_MS);
  return then === undefined ? null : round1(currentWeightKg - then);
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
  const weightAtOrBefore = carryForward(weights);

  const w30 = weightAtOrBefore(now.getTime() - 30 * DAY_MS);
  const w60 = weightAtOrBefore(now.getTime() - 60 * DAY_MS);

  return {
    weightChangeKg: w30 === undefined ? 0 : round1(currentWeightKg - w30),
    weightChangeLastMonthKg:
      w30 === undefined || w60 === undefined ? 0 : round1(w30 - w60),
  };
}

export type GoalDirection = 'lose' | 'gain' | 'maintain';

/**
 * What kind of plan this is. Pace 0 is maintenance and nothing else (ADR-0007),
 * so it is asked first; otherwise the direction comes from the target against
 * the **start** weight, never the current one, which is what lets it survive
 * overshooting the target.
 */
export function goalDirection(
  startWeightKg: number,
  targetWeightKg: number,
  pace: number,
): GoalDirection {
  if (pace === 0) return 'maintain';
  return targetWeightKg < startWeightKg ? 'lose' : 'gain';
}

/**
 * Kilograms still to go, measured in the goal's own direction, so an overshoot
 * reads 0 rather than counting back up. Null on a maintenance plan — there is
 * no destination to be short of.
 */
export function remainingToGoalKg(
  currentWeightKg: number,
  targetWeightKg: number,
  direction: GoalDirection,
): number | null {
  if (direction === 'maintain') return null;
  const remaining =
    direction === 'lose'
      ? currentWeightKg - targetWeightKg
      : targetWeightKg - currentWeightKg;
  return Math.max(0, round1(remaining));
}

export type CalorieSplitSegment = {
  /** Meal type, or 'remaining' for the unfilled part of the target. */
  key: MealType | 'remaining';
  kcal: number;
};

/**
 * One day's calories split into the four meal times plus what is left of the
 * target — the donut's segments. Empty meal times are dropped (a zero segment
 * draws nothing but crowds the legend), while `remaining` is kept even at 0 so
 * a day exactly on target still closes the ring.
 *
 * Over target, `remaining` is 0 and the ring is the meals alone: a negative
 * segment has no drawing, and the deficit is stated in words by the card that
 * owns the figure.
 *
 * Takes the day's meals already scoped (todaysMeals) and the remainder the read
 * model derived, rather than a date and a target to re-derive them from. The
 * card prints `remainingKcal` in the ring's hole, so a second derivation here
 * would let the hole and the arc around it disagree — and the day's totals come
 * from the Dashboard read model, never re-summed from the meal list.
 */
export function splitCaloriesByMealType(
  dayMeals: MealResponse[],
  remainingKcal: number,
): CalorieSplitSegment[] {
  const byType = groupMealsByType(dayMeals)
    .filter((group) => group.totalKcal > 0)
    .map((group) => ({ key: group.mealType, kcal: group.totalKcal }));

  return [...byType, { key: 'remaining', kcal: Math.max(0, remainingKcal) }];
}
