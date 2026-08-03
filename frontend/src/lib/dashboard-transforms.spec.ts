import { describe, it, expect } from 'vitest';
import type {
  MealResponse,
  MealType,
  WeightEntryResponse,
} from '@foodnote/shared';
import {
  addDays,
  bucketDailyCalories,
  buildWeightTrend,
  computeWeightChange,
  formatDayLabel,
  formatGoalDate,
  goalDirection,
  isFutureDay,
  isoDaysAgo,
  mealTypeForHour,
  remainingToGoalKg,
  splitCaloriesByMealType,
  todaysMeals,
  todayUtc,
  utcDay,
  weightChangeOverDays,
} from './dashboard-transforms';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

// Fixed anchor used throughout — a Tuesday so "yesterday" is Monday.
const NOW = new Date('2024-07-30T12:00:00Z');

function meal(
  id: string,
  recordedAt: string,
  totalCalories: number,
): MealResponse {
  return {
    id,
    mealName: 'Test',
    mealType: 'lunch',
    recordedAt,
    totalCalories,
    proteinGrams: 0,
    carbsGrams: 0,
    fatGrams: 0,
    source: 'manual',
    items: [],
  };
}

function weight(
  id: string,
  recordedAt: string,
  weightKg: number,
): WeightEntryResponse {
  return { id, recordedAt, weightKg };
}

// ---------------------------------------------------------------------------
// utcDay
// ---------------------------------------------------------------------------

describe('utcDay', () => {
  it('extracts the date part of an ISO timestamp', () => {
    expect(utcDay('2024-07-30T15:42:00.000Z')).toBe('2024-07-30');
  });

  it('handles midnight exactly', () => {
    expect(utcDay('2024-07-30T00:00:00.000Z')).toBe('2024-07-30');
  });

  it('works with date-only strings', () => {
    expect(utcDay('2024-07-30')).toBe('2024-07-30');
  });
});

// ---------------------------------------------------------------------------
// todayUtc
// ---------------------------------------------------------------------------

describe('todayUtc', () => {
  it('returns the UTC date of the given instant', () => {
    expect(todayUtc(new Date('2024-07-30T23:59:59Z'))).toBe('2024-07-30');
  });

  it('returns the next UTC date when local midnight rolls over but UTC has not', () => {
    // 2024-07-31T00:30:00Z is already July 31 UTC
    expect(todayUtc(new Date('2024-07-31T00:30:00Z'))).toBe('2024-07-31');
  });
});

// ---------------------------------------------------------------------------
// isoDaysAgo
// ---------------------------------------------------------------------------

describe('isoDaysAgo', () => {
  it('returns today for 0 days ago', () => {
    expect(isoDaysAgo(0, new Date('2024-07-30T12:00:00Z'))).toBe('2024-07-30');
  });

  it('returns yesterday for 1 day ago', () => {
    expect(isoDaysAgo(1, new Date('2024-07-30T12:00:00Z'))).toBe('2024-07-29');
  });

  it('returns 6 days ago correctly', () => {
    expect(isoDaysAgo(6, new Date('2024-07-30T12:00:00Z'))).toBe('2024-07-24');
  });

  it('crosses a month boundary', () => {
    expect(isoDaysAgo(1, new Date('2024-08-01T12:00:00Z'))).toBe('2024-07-31');
  });
});

// ---------------------------------------------------------------------------
// addDays
// ---------------------------------------------------------------------------

describe('addDays', () => {
  it('advances by one day', () => {
    expect(addDays('2024-07-30', 1)).toBe('2024-07-31');
  });

  it('goes back by one day', () => {
    expect(addDays('2024-07-30', -1)).toBe('2024-07-29');
  });

  it('returns the same date for 0', () => {
    expect(addDays('2024-07-30', 0)).toBe('2024-07-30');
  });

  it('crosses a month boundary forward', () => {
    expect(addDays('2024-07-31', 1)).toBe('2024-08-01');
  });

  it('crosses a month boundary backward', () => {
    expect(addDays('2024-08-01', -1)).toBe('2024-07-31');
  });

  it('crosses a year boundary forward', () => {
    expect(addDays('2023-12-31', 1)).toBe('2024-01-01');
  });

  it('handles leap-day correctly', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
  });

  it('adds multiple days', () => {
    expect(addDays('2024-07-28', 7)).toBe('2024-08-04');
  });
});

// ---------------------------------------------------------------------------
// isFutureDay
// ---------------------------------------------------------------------------

describe('isFutureDay', () => {
  it('returns false for today', () => {
    expect(isFutureDay('2024-07-30', NOW)).toBe(false);
  });

  it('returns false for a past day', () => {
    expect(isFutureDay('2024-07-29', NOW)).toBe(false);
  });

  it('returns true for tomorrow', () => {
    expect(isFutureDay('2024-07-31', NOW)).toBe(true);
  });

  it('returns true for a far-future date', () => {
    expect(isFutureDay('2030-01-01', NOW)).toBe(true);
  });

  it('is sensitive to the "now" argument', () => {
    const earlier = new Date('2024-07-28T12:00:00Z');
    const later = new Date('2024-07-31T12:00:00Z');
    expect(isFutureDay('2024-07-30', earlier)).toBe(true);
    expect(isFutureDay('2024-07-30', later)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formatDayLabel
// ---------------------------------------------------------------------------

describe('formatDayLabel', () => {
  it('returns "Today" for the same UTC day as now', () => {
    expect(formatDayLabel('2024-07-30', NOW)).toBe('Today');
  });

  it('returns "Yesterday" for one day before', () => {
    expect(formatDayLabel('2024-07-29', NOW)).toBe('Yesterday');
  });

  it('returns a formatted date for two days ago (Sunday)', () => {
    expect(formatDayLabel('2024-07-28', NOW)).toBe('Sun, Jul 28');
  });

  it('returns a formatted date for a date in a different month', () => {
    expect(formatDayLabel('2024-06-15', NOW)).toBe('Sat, Jun 15');
  });

  it('never returns "Today" or "Yesterday" for older dates', () => {
    const label = formatDayLabel('2024-01-01', NOW);
    expect(label).not.toBe('Today');
    expect(label).not.toBe('Yesterday');
  });

  it('handles year boundaries correctly', () => {
    const jan2 = new Date('2024-01-02T12:00:00Z');
    expect(formatDayLabel('2023-12-31', jan2)).not.toBe('Yesterday');
    expect(formatDayLabel('2024-01-01', jan2)).toBe('Yesterday');
  });
});

// ---------------------------------------------------------------------------
// mealTypeForHour
// ---------------------------------------------------------------------------

describe('mealTypeForHour', () => {
  it('returns breakfast before 11:00', () => {
    expect(mealTypeForHour(0)).toBe('breakfast');
    expect(mealTypeForHour(10)).toBe('breakfast');
  });

  it('returns lunch from 11:00 to 15:59', () => {
    expect(mealTypeForHour(11)).toBe('lunch');
    expect(mealTypeForHour(15)).toBe('lunch');
  });

  it('returns dinner from 16:00 to 20:59', () => {
    expect(mealTypeForHour(16)).toBe('dinner');
    expect(mealTypeForHour(20)).toBe('dinner');
  });

  it('returns snack from 21:00 onwards', () => {
    expect(mealTypeForHour(21)).toBe('snack');
    expect(mealTypeForHour(23)).toBe('snack');
  });
});

// ---------------------------------------------------------------------------
// formatGoalDate
// ---------------------------------------------------------------------------

describe('formatGoalDate', () => {
  it('formats a goal date as "Mon DD"', () => {
    expect(formatGoalDate('2024-09-19')).toBe('Sep 19');
  });

  it('formats January correctly', () => {
    expect(formatGoalDate('2025-01-01')).toBe('Jan 1');
  });

  it('does not shift the day due to timezone (UTC-anchored)', () => {
    // The date is always interpreted as midnight UTC — no local-TZ shift.
    expect(formatGoalDate('2024-12-31')).toBe('Dec 31');
  });
});

// ---------------------------------------------------------------------------
// todaysMeals
// ---------------------------------------------------------------------------

describe('todaysMeals', () => {
  const DATE = '2024-07-30';

  it('returns only meals on the given UTC tracking day', () => {
    const list = [
      meal('a', '2024-07-30T08:00:00Z', 500),
      meal('b', '2024-07-29T20:00:00Z', 600), // yesterday — excluded
      meal('c', '2024-07-30T13:00:00Z', 700),
    ];
    const result = todaysMeals(list, DATE);
    expect(result.map((m) => m.id)).toEqual(['c', 'a']); // newest first
  });

  it('returns an empty array when no meals match', () => {
    expect(todaysMeals([], DATE)).toEqual([]);
    expect(todaysMeals([meal('x', '2024-07-29T10:00:00Z', 400)], DATE)).toEqual(
      [],
    );
  });

  it('sorts newest first', () => {
    const list = [
      meal('early', '2024-07-30T06:00:00Z', 300),
      meal('late', '2024-07-30T20:00:00Z', 400),
      meal('mid', '2024-07-30T12:00:00Z', 500),
    ];
    expect(todaysMeals(list, DATE).map((m) => m.id)).toEqual([
      'late',
      'mid',
      'early',
    ]);
  });

  it('excludes a meal recorded 1 second past midnight UTC (belongs to next day)', () => {
    const list = [meal('next', '2024-07-31T00:00:01Z', 200)];
    expect(todaysMeals(list, DATE)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// bucketDailyCalories
// ---------------------------------------------------------------------------

describe('bucketDailyCalories', () => {
  const DATE = '2024-07-30'; // Tuesday

  it('always returns exactly 7 buckets', () => {
    expect(bucketDailyCalories([], DATE)).toHaveLength(7);
  });

  it('last bucket is the tracking day', () => {
    const buckets = bucketDailyCalories([], DATE);
    expect(buckets.at(-1)!.day).toBe('Tue'); // 2024-07-30 is Tuesday
  });

  it('second-to-last bucket is the day before (yesterday)', () => {
    const buckets = bucketDailyCalories([], DATE);
    expect(buckets.at(-2)!.day).toBe('Mon'); // 2024-07-29 is Monday
  });

  it('produces honest zero kcal for empty days', () => {
    const buckets = bucketDailyCalories([], DATE);
    expect(buckets.every((b) => b.kcal === 0)).toBe(true);
  });

  it('sums multiple meals on the same day', () => {
    const list = [
      meal('a', '2024-07-30T08:00:00Z', 400),
      meal('b', '2024-07-30T13:00:00Z', 600),
    ];
    const buckets = bucketDailyCalories(list, DATE);
    expect(buckets.at(-1)!.kcal).toBe(1000);
  });

  it('assigns meals to the correct bucket', () => {
    const list = [
      meal('yesterday', '2024-07-29T10:00:00Z', 300),
      meal('today', '2024-07-30T10:00:00Z', 500),
      meal('old', '2024-07-24T10:00:00Z', 200), // 6 days ago — first bucket
    ];
    const buckets = bucketDailyCalories(list, DATE);
    expect(buckets[0].kcal).toBe(200); // oldest bucket
    expect(buckets.at(-2)!.kcal).toBe(300); // yesterday
    expect(buckets.at(-1)!.kcal).toBe(500); // today
  });

  it('ignores meals outside the 7-day window', () => {
    // 7 days before 2024-07-30 is 2024-07-23 — the window covers 24–30
    const list = [meal('outside', '2024-07-23T10:00:00Z', 999)];
    const buckets = bucketDailyCalories(list, DATE);
    expect(buckets.every((b) => b.kcal === 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildWeightTrend
// ---------------------------------------------------------------------------

describe('buildWeightTrend', () => {
  const NOW_TREND = new Date('2024-07-30T00:00:00Z');
  const goalWithProjection = {
    currentWeightKg: 80,
    targetWeightKg: 75,
    projectedGoalDate: '2024-12-31',
  };
  const goalReached = {
    currentWeightKg: 75,
    targetWeightKg: 75,
    projectedGoalDate: null,
  };

  const daysAgo = (days: number) =>
    new Date(NOW_TREND.getTime() - days * 86_400_000).toISOString();

  it('plots one point per entry, not one per week', () => {
    // The regression this function was rewritten for: a week of daily
    // weigh-ins used to collapse into a single plotted point.
    const weights = [
      weight('a', daysAgo(4), 82),
      weight('b', daysAgo(3), 81.8),
      weight('c', daysAgo(2), 81.5),
      weight('d', daysAgo(1), 81.4),
    ];
    const trend = buildWeightTrend(weights, goalReached, NOW_TREND);
    expect(trend.filter((p) => p.actual !== undefined)).toHaveLength(4);
  });

  it('keeps entries in recorded order, oldest first', () => {
    const weights = [
      weight('new', daysAgo(1), 81),
      weight('old', daysAgo(5), 83),
    ];
    const trend = buildWeightTrend(weights, goalReached, NOW_TREND);
    expect(trend.map((p) => p.actual)).toEqual([83, 81]);
  });

  it('labels each point by its own date', () => {
    const trend = buildWeightTrend(
      [weight('w', '2024-07-21T09:00:00.000Z', 82)],
      goalReached,
      NOW_TREND,
    );
    expect(trend[0].label).toBe('Jul 21');
  });

  it('falls back to the current weight when the journal is empty', () => {
    const trend = buildWeightTrend([], goalReached, NOW_TREND);
    expect(trend).toHaveLength(1);
    expect(trend[0].actual).toBe(75);
  });

  it('starts the projection from the last actual point', () => {
    const weights = [weight('w', daysAgo(1), 81.4)];
    const trend = buildWeightTrend(weights, goalWithProjection, NOW_TREND);
    const lastActual = trend.find((p) => p.actual !== undefined)!;
    expect(lastActual.projected).toBe(81.4);
  });

  it('places the projection endpoint at the target weight', () => {
    const trend = buildWeightTrend(
      [weight('w', daysAgo(1), 81.4)],
      goalWithProjection,
      NOW_TREND,
    );
    const last = trend.at(-1)!;
    expect(last.projected).toBe(75);
    expect(last.actual).toBeUndefined();
    expect(last.label).toBe('Dec 31');
  });

  it('draws no projection once the target is reached', () => {
    const trend = buildWeightTrend(
      [weight('w', daysAgo(1), 75)],
      goalReached,
      NOW_TREND,
    );
    expect(trend.every((p) => p.projected === undefined)).toBe(true);
  });

  it('carries a straight least-squares fit through the readings', () => {
    // A perfectly linear journal: the fit must reproduce it exactly, and the
    // step between consecutive points must be constant.
    const weights = [
      weight('a', daysAgo(4), 84),
      weight('b', daysAgo(3), 83),
      weight('c', daysAgo(2), 82),
      weight('d', daysAgo(1), 81),
    ];
    const trend = buildWeightTrend(weights, goalReached, NOW_TREND);
    expect(trend.map((p) => p.trend)).toEqual([84, 83, 82, 81]);
  });

  it('smooths a noisy reading rather than following it', () => {
    const weights = [
      weight('a', daysAgo(4), 84),
      weight('b', daysAgo(3), 83),
      weight('c', daysAgo(2), 88), // a water-weight spike
      weight('d', daysAgo(1), 81),
    ];
    const trend = buildWeightTrend(weights, goalReached, NOW_TREND);
    const spike = trend[2];
    expect(spike.actual).toBe(88);
    expect(spike.trend).toBeLessThan(88);
  });

  it('stays straight across a gap in the journal', () => {
    // Two readings a day apart, then one twenty days later. The axis gives all
    // three an equal slot, so the fit steps evenly too.
    const weights = [
      weight('a', daysAgo(22), 84),
      weight('b', daysAgo(21), 83),
      weight('c', daysAgo(1), 63),
    ];
    const trend = buildWeightTrend(weights, goalReached, NOW_TREND);
    const steps = [
      trend[1].trend! - trend[0].trend!,
      trend[2].trend! - trend[1].trend!,
    ];
    expect(steps[0]).toBeCloseTo(steps[1], 5);
  });

  it('has no trend below two readings', () => {
    const trend = buildWeightTrend(
      [weight('w', daysAgo(1), 81)],
      goalReached,
      NOW_TREND,
    );
    expect(trend[0].trend).toBeUndefined();
  });

  it('keeps two entries on the same day as two points', () => {
    // The journal is append-only and allows any number of entries per day, so
    // a morning and an evening weigh-in are two readings, not one.
    const weights = [
      weight('am', '2024-07-29T07:00:00.000Z', 81.9),
      weight('pm', '2024-07-29T20:00:00.000Z', 81.2),
    ];
    const trend = buildWeightTrend(weights, goalReached, NOW_TREND);
    expect(trend.map((p) => p.actual)).toEqual([81.9, 81.2]);
  });
});

// ---------------------------------------------------------------------------
// computeWeightChange
// ---------------------------------------------------------------------------

describe('computeWeightChange', () => {
  const NOW_WEIGHT = new Date('2024-07-30T00:00:00Z');
  const CURRENT_KG = 80;

  it('returns 0 for both changes when there is no weight history', () => {
    const result = computeWeightChange([], CURRENT_KG, NOW_WEIGHT);
    expect(result.weightChangeKg).toBe(0);
    expect(result.weightChangeLastMonthKg).toBe(0);
  });

  it('returns 0 when history only covers less than 30 days', () => {
    // Entry 10 days ago — not old enough to anchor the 30-day comparison.
    const tenDaysAgo = new Date(
      NOW_WEIGHT.getTime() - 10 * 86_400_000,
    ).toISOString();
    const result = computeWeightChange(
      [weight('w', tenDaysAgo, 81)],
      CURRENT_KG,
      NOW_WEIGHT,
    );
    expect(result.weightChangeKg).toBe(0);
  });

  it('calculates the 30-day weight change', () => {
    // Entry exactly 30 days ago.
    const thirtyDaysAgo = new Date(
      NOW_WEIGHT.getTime() - 30 * 86_400_000,
    ).toISOString();
    const result = computeWeightChange(
      [weight('w', thirtyDaysAgo, 82)],
      CURRENT_KG,
      NOW_WEIGHT,
    );
    // current (80) − w30 (82) = −2.0 kg
    expect(result.weightChangeKg).toBe(-2.0);
  });

  it('rounds to 1 decimal place', () => {
    const thirtyDaysAgo = new Date(
      NOW_WEIGHT.getTime() - 30 * 86_400_000,
    ).toISOString();
    const result = computeWeightChange(
      [weight('w', thirtyDaysAgo, 81.16)],
      80,
      NOW_WEIGHT,
    );
    // 80 − 81.16 = −1.16 → Math.round(−11.6) = −12 → −1.2
    expect(result.weightChangeKg).toBe(-1.2);
  });

  it('calculates both 30-day and 60-day changes when full history exists', () => {
    const thirtyDaysAgo = new Date(
      NOW_WEIGHT.getTime() - 30 * 86_400_000,
    ).toISOString();
    const sixtyDaysAgo = new Date(
      NOW_WEIGHT.getTime() - 60 * 86_400_000,
    ).toISOString();
    const result = computeWeightChange(
      [weight('w60', sixtyDaysAgo, 85), weight('w30', thirtyDaysAgo, 82)],
      CURRENT_KG,
      NOW_WEIGHT,
    );
    expect(result.weightChangeKg).toBe(-2.0); // 80 − 82
    expect(result.weightChangeLastMonthKg).toBe(-3.0); // 82 − 85
  });

  it('uses carry-forward for the 30-day anchor (latest entry at or before)', () => {
    // Entry 35 days ago — closest entry at or before the 30-day mark.
    const thirtyFiveDaysAgo = new Date(
      NOW_WEIGHT.getTime() - 35 * 86_400_000,
    ).toISOString();
    const result = computeWeightChange(
      [weight('w', thirtyFiveDaysAgo, 83)],
      CURRENT_KG,
      NOW_WEIGHT,
    );
    expect(result.weightChangeKg).toBe(-3.0); // 80 − 83
  });
});

// ---------------------------------------------------------------------------
// weightChangeOverDays
// ---------------------------------------------------------------------------

describe('weightChangeOverDays', () => {
  const NOW_WINDOW = new Date('2024-07-30T00:00:00Z');
  const daysAgo = (days: number) =>
    new Date(NOW_WINDOW.getTime() - days * 86_400_000).toISOString();

  it('returns null when the journal does not reach back that far', () => {
    // Distinct from 0: a fresh account has made no comparison, not a flat one.
    expect(
      weightChangeOverDays([weight('w', daysAgo(2), 81)], 80, NOW_WINDOW, 7),
    ).toBeNull();
  });

  it('returns null on an empty journal', () => {
    expect(weightChangeOverDays([], 80, NOW_WINDOW, 7)).toBeNull();
  });

  it('measures against the entry in effect a week ago', () => {
    expect(
      weightChangeOverDays([weight('w', daysAgo(7), 80.6)], 80, NOW_WINDOW, 7),
    ).toBe(-0.6);
  });

  it('carries the latest entry at or before the anchor forward', () => {
    // Nothing was logged on the anchor day itself; the 10-day-old entry stands.
    const entries = [
      weight('old', daysAgo(10), 82),
      weight('new', daysAgo(1), 80),
    ];
    expect(weightChangeOverDays(entries, 80, NOW_WINDOW, 7)).toBe(-2.0);
  });

  it('reports a gain as a positive number', () => {
    expect(
      weightChangeOverDays([weight('w', daysAgo(7), 79.5)], 80, NOW_WINDOW, 7),
    ).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// goalDirection
// ---------------------------------------------------------------------------

describe('goalDirection', () => {
  it('is maintenance whenever the pace is 0, whatever the weights say', () => {
    expect(goalDirection(80, 75, 0)).toBe('maintain');
  });

  it('reads the direction from the target against the start weight', () => {
    expect(goalDirection(80, 75, 0.5)).toBe('lose');
    expect(goalDirection(70, 75, 0.5)).toBe('gain');
  });

  it('survives overshooting the target', () => {
    // Current weight is irrelevant here by design — a loss plan whose target
    // was passed is still a loss plan.
    expect(goalDirection(80, 75, 0.5)).toBe('lose');
  });
});

// ---------------------------------------------------------------------------
// remainingToGoalKg
// ---------------------------------------------------------------------------

describe('remainingToGoalKg', () => {
  it('measures in the goal direction', () => {
    expect(remainingToGoalKg(74.5, 72, 'lose')).toBe(2.5);
    expect(remainingToGoalKg(70, 75, 'gain')).toBe(5);
  });

  it('clamps an overshoot to 0 rather than counting back up', () => {
    expect(remainingToGoalKg(71, 72, 'lose')).toBe(0);
    expect(remainingToGoalKg(76, 75, 'gain')).toBe(0);
  });

  it('is null on a maintenance plan', () => {
    expect(remainingToGoalKg(74.5, 74.5, 'maintain')).toBeNull();
  });

  it('rounds to 1 decimal place', () => {
    expect(remainingToGoalKg(74.56, 72, 'lose')).toBe(2.6);
  });
});

// ---------------------------------------------------------------------------
// splitCaloriesByMealType
// ---------------------------------------------------------------------------

describe('splitCaloriesByMealType', () => {
  const DAY = '2024-07-30';

  function typedMeal(
    id: string,
    mealType: MealType,
    totalCalories: number,
  ): MealResponse {
    return { ...meal(id, `${DAY}T12:00:00.000Z`, totalCalories), mealType };
  }

  it('keeps the contract order of meal types', () => {
    const segments = splitCaloriesByMealType(
      [
        typedMeal('d', 'dinner', 300),
        typedMeal('b', 'breakfast', 200),
        typedMeal('s', 'snack', 100),
        typedMeal('l', 'lunch', 400),
      ],
      1000,
    );
    expect(segments.map((s) => s.key)).toEqual([
      'breakfast',
      'lunch',
      'dinner',
      'snack',
      'remaining',
    ]);
  });

  it('sums several meals of the same type', () => {
    const segments = splitCaloriesByMealType(
      [typedMeal('a', 'lunch', 300), typedMeal('b', 'lunch', 250)],
      1450,
    );
    expect(segments.find((s) => s.key === 'lunch')?.kcal).toBe(550);
  });

  it('drops meal times with nothing logged', () => {
    const segments = splitCaloriesByMealType(
      [typedMeal('b', 'breakfast', 400)],
      1600,
    );
    expect(segments.map((s) => s.key)).toEqual(['breakfast', 'remaining']);
  });

  it('takes the remainder from the read model rather than re-deriving it', () => {
    const segments = splitCaloriesByMealType(
      [typedMeal('b', 'breakfast', 400)],
      1600,
    );
    expect(segments.find((s) => s.key === 'remaining')?.kcal).toBe(1600);
  });

  it('keeps a zero remainder so a day on target still closes the ring', () => {
    const segments = splitCaloriesByMealType(
      [typedMeal('b', 'breakfast', 2000)],
      0,
    );
    expect(segments.at(-1)).toEqual({ key: 'remaining', kcal: 0 });
  });

  it('floors the remainder at 0 when the day went over', () => {
    const segments = splitCaloriesByMealType(
      [typedMeal('b', 'breakfast', 2400)],
      -400,
    );
    expect(segments.at(-1)?.kcal).toBe(0);
  });
});
