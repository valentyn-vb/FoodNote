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

// Module-level, not per call: constructing an Intl formatter resolves the locale
// and compiles a pattern, which is the expensive half. `buildWeightTrend` calls
// DAY_LABEL once per Weight Entry across a 60-day window, inside a memo that
// recomputes on every save and every day step.
const DAY_MONTH = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

const WEEKDAY_MONTH_DAY = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

const WEEKDAY = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  timeZone: 'UTC',
});

const TIME_OF_DAY = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});

const DATE_AND_TIME = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export type WeightTrendPoint = {
  label: string;
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
  return WEEKDAY_MONTH_DAY.format(new Date(`${isoDate}T00:00:00Z`));
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
  return DAY_MONTH.format(new Date(`${date}T00:00:00Z`));
}

/** Whole weeks from `now` until a goal date (never negative). */
export function weeksUntil(date: string, now: Date): number {
  const diff = Date.parse(`${date}T00:00:00Z`) - now.getTime();
  return Math.max(0, Math.ceil(diff / (7 * DAY_MS)));
}

/** A logged-at label for a meal row, in the viewer's local time ("12:40 PM"). */
export function formatMealTime(iso: string): string {
  return TIME_OF_DAY.format(new Date(iso));
}

/** A weight entry's logged-at label, in the viewer's local time ("Jul 27, 3:06 PM"). */
export function formatEntryDate(iso: string): string {
  return DATE_AND_TIME.format(new Date(iso));
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
  const baseMs = Date.parse(`${date}T00:00:00Z`);

  return Array.from({ length: 7 }, (_, idx) => {
    const dayMs = baseMs - (6 - idx) * DAY_MS;
    const bucketDate = new Date(dayMs).toISOString().slice(0, 10);
    const kcal = meals
      .filter((m) => utcDay(m.recordedAt) === bucketDate)
      .reduce((sum, m) => sum + m.totalCalories, 0);
    return { day: WEEKDAY.format(new Date(dayMs)), kcal };
  });
}

type GoalBlock = Pick<
  DashboardResponse['goal'],
  'currentWeightKg' | 'targetWeightKg' | 'projectedGoalDate'
>;

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
 * Weight-trend series: one point per Weight Entry, in the order they were
 * recorded and labelled by date, followed by a two-point projection to the
 * target at the Projected Goal Date. A reached target (null projectedGoalDate)
 * draws the actual line alone.
 *
 * One point per entry, and not the six rolling weekly buckets this used to
 * build. Those kept only the latest entry in each 7-day window and always drew
 * six of them, so a week of daily weigh-ins — the shape a real journal has
 * when someone has just started — collapsed into a single plotted point with
 * five empty ones beside it, and the card read as a chart that had failed to
 * load. Bucketing suited the seeded account, whose entries are spread across
 * weeks, and nothing else.
 *
 * An empty journal still yields a point, from the authoritative Current
 * Weight: the goal block has a weight even when the 60-day window came back
 * empty, and a chart with nothing in it would be the worse answer.
 *
 * Each reading also carries the least-squares line through all of them, which
 * is what the day-to-day noise of a bathroom scale hides: water weight moves a
 * reading by more than a week of a 0.5 kg/week plan does.
 */
export function buildWeightTrend(
  weights: WeightEntryResponse[],
  goal: GoalBlock,
  now: Date,
): WeightTrendPoint[] {
  const sorted = [...weights].sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt),
  );

  // Fitted over positions in the series, not over instants. The chart's x axis
  // is categorical — every reading gets an equal slot whatever the gap before
  // it — so a fit over timestamps renders as a bend at each irregular gap, and
  // a line that is meant to read as "the direction, with the noise removed"
  // has no business being the second wobbly line on the card.
  const fit = fitLine(sorted.map((entry, i) => [i, entry.weightKg]));

  const points: WeightTrendPoint[] = sorted.map((entry, i) => ({
    label: formatGoalDate(utcDay(entry.recordedAt)),
    actual: entry.weightKg,
    trend: fit?.(i),
  }));

  if (points.length === 0) {
    points.push({
      label: formatGoalDate(todayUtc(now)),
      actual: goal.currentWeightKg,
    });
  }

  if (goal.projectedGoalDate) {
    // The projection continues from the last actual point, so the dashed line
    // picks up exactly where the solid one ends rather than starting in space.
    points[points.length - 1].projected = points[points.length - 1].actual;
    points.push({
      label: formatGoalDate(goal.projectedGoalDate),
      projected: goal.targetWeightKg,
    });
  }

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
