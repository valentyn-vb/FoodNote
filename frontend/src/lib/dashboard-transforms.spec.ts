import { describe, it, expect } from 'vitest';
import type { MealResponse, WeightEntryResponse } from '@foodnote/shared';
import {
  addDays,
  bucketDailyCalories,
  buildWeightTrend,
  computeWeightChange,
  formatDayLabel,
  formatGoalDate,
  isFutureDay,
  isoDaysAgo,
  mealTypeForHour,
  todaysMeals,
  todayUtc,
  utcDay,
  weeksUntil,
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

function weight(id: string, recordedAt: string, weightKg: number): WeightEntryResponse {
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
// weeksUntil
// ---------------------------------------------------------------------------

describe('weeksUntil', () => {
  // Use midnight UTC as `now` to avoid fractional-day edge cases.
  const anchor = new Date('2024-07-30T00:00:00Z');

  it('returns 1 for exactly one week ahead', () => {
    expect(weeksUntil('2024-08-06', anchor)).toBe(1);
  });

  it('returns 2 for exactly two weeks ahead', () => {
    expect(weeksUntil('2024-08-13', anchor)).toBe(2);
  });

  it('rounds up a partial week', () => {
    // 8 days → ceil(8/7) = 2
    expect(weeksUntil('2024-08-07', anchor)).toBe(2);
  });

  it('returns 0 for a past date (never negative)', () => {
    expect(weeksUntil('2024-07-01', anchor)).toBe(0);
  });

  it('returns 0 for yesterday', () => {
    expect(weeksUntil('2024-07-29', anchor)).toBe(0);
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
    expect(
      todaysMeals([meal('x', '2024-07-29T10:00:00Z', 400)], DATE),
    ).toEqual([]);
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

  it('always includes a "Now" point with the current weight', () => {
    const trend = buildWeightTrend([], goalWithProjection, NOW_TREND);
    const nowPoint = trend.find((p) => p.label === 'Now');
    expect(nowPoint?.actual).toBe(80);
  });

  it('has 8 points total (6 historical + Now + projection) with a goal date', () => {
    const trend = buildWeightTrend([], goalWithProjection, NOW_TREND);
    expect(trend).toHaveLength(8);
  });

  it('has 7 points total (6 historical + Now) when the target is reached', () => {
    const trend = buildWeightTrend([], goalReached, NOW_TREND);
    expect(trend).toHaveLength(7);
  });

  it('sets "Now" as the projection start when a goal date exists', () => {
    const trend = buildWeightTrend([], goalWithProjection, NOW_TREND);
    const nowPoint = trend.find((p) => p.label === 'Now')!;
    expect(nowPoint.projected).toBe(80); // projected starts from current weight
  });

  it('does not set projected on "Now" when target is reached', () => {
    const trend = buildWeightTrend([], goalReached, NOW_TREND);
    const nowPoint = trend.find((p) => p.label === 'Now')!;
    expect(nowPoint.projected).toBeUndefined();
  });

  it('fills historical buckets with the latest entry in each 7-day window', () => {
    // Place one entry ~21 days ago (3w ago bucket)
    const threeWeeksAgo = new Date(
      NOW_TREND.getTime() - 21 * 86_400_000 + 3600000,
    ).toISOString();
    const weights = [weight('w1', threeWeeksAgo, 83)];
    const trend = buildWeightTrend(weights, goalWithProjection, NOW_TREND);
    const bucket = trend.find((p) => p.label === '3w ago');
    expect(bucket?.actual).toBe(83);
  });

  it('leaves buckets with no entries as actual=undefined', () => {
    const trend = buildWeightTrend([], goalWithProjection, NOW_TREND);
    const historicalPoints = trend.filter((p) => p.label.endsWith('w ago'));
    expect(historicalPoints.every((p) => p.actual === undefined)).toBe(true);
  });

  it('places the projection endpoint at the target weight', () => {
    const trend = buildWeightTrend([], goalWithProjection, NOW_TREND);
    const lastPoint = trend.at(-1)!;
    expect(lastPoint.projected).toBe(75);
    expect(lastPoint.actual).toBeUndefined();
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