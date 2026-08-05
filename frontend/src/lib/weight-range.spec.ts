import { describe, expect, it } from 'vitest';
import { calendarDate, calendarDay } from './dashboard-transforms';
import {
  RANGE_DAYS,
  WEIGHT_RANGE_PRESETS,
  canStepForward,
  matchPreset,
  presetRange,
  rangeDays,
  rangeLabel,
  shiftRange,
  weightRangeFrom,
  DEFAULT_RANGE_PRESET,
} from './weight-range';

// Fixed instant, mid-day UTC, so nothing here depends on when the suite runs.
// Mid-day rather than midnight on purpose: the bounds are UTC calendar days, so
// a noon `now` proves the time-of-day is discarded rather than rounding a
// boundary by luck.
const NOW = new Date('2026-08-04T12:00:00Z');

describe('presetRange', () => {
  it('given the 30D preset, when its window is computed, then it ends today and starts 30 days back', () => {
    expect(presetRange('30D', NOW)).toEqual({
      from: '2026-07-05',
      to: '2026-08-04',
    });
  });

  it('given each preset, when its window is computed, then it ends today', () => {
    for (const preset of WEIGHT_RANGE_PRESETS) {
      expect(presetRange(preset, NOW).to).toBe('2026-08-04');
    }
  });

  it('given the longer presets, when their windows are computed, then the span matches the preset length', () => {
    expect(presetRange('3M', NOW).from).toBe('2026-05-06');
    expect(presetRange('6M', NOW).from).toBe('2026-02-05');
    expect(presetRange('1Y', NOW).from).toBe('2025-08-04');
  });

  it('given a range older than the dashboard’s fixed 60-day window, when computed, then it is still reachable', () => {
    // The ticket's Done-when: "An entry older than 60 days is reachable." The
    // dashboard provider fetches a fixed 60 days; these bounds are what let the
    // page ask for anything older.
    expect(presetRange('1Y', NOW).from < '2026-06-05').toBe(true);
  });

  it('given any preset, when its length is read, then it is a whole number of days', () => {
    for (const preset of WEIGHT_RANGE_PRESETS) {
      expect(Number.isInteger(RANGE_DAYS[preset])).toBe(true);
      expect(RANGE_DAYS[preset]).toBeGreaterThan(0);
    }
  });
});

describe('rangeDays', () => {
  it('given a window, when its length is measured, then it is the whole days between its ends', () => {
    expect(rangeDays({ from: '2026-07-05', to: '2026-08-04' })).toBe(30);
    // Across a spring-forward in the viewer's zone: the arithmetic is UTC, so
    // the count cannot come out at 29.958 and truncate to 29.
    expect(rangeDays({ from: '2026-03-01', to: '2026-03-31' })).toBe(30);
  });
});

describe('calendarDay / calendarDate', () => {
  // Built from local parts on purpose: that is what react-day-picker hands
  // back, and asserting against a UTC literal instead would make these pass or
  // fail on the runner's timezone rather than on the conversion.
  it('given a day tapped in the calendar, when read, then it is the day printed on the cell', () => {
    // `toISOString().slice(0, 10)` returns 2026-07-31 here for anyone east of
    // UTC — the bug this pair exists to close.
    expect(calendarDay(new Date(2026, 7, 1))).toBe('2026-08-01');
    expect(calendarDay(new Date(2026, 0, 9))).toBe('2026-01-09');
  });

  it('given a day string, when turned back into a date, then it round-trips', () => {
    expect(calendarDay(calendarDate('2026-08-04'))).toBe('2026-08-04');
  });
});

describe('shiftRange', () => {
  it('given a window, when stepped back, then it moves a whole period and abuts the one it left', () => {
    const current = presetRange('30D', NOW);
    const previous = shiftRange(current, -1, NOW);

    expect(previous).toEqual({ from: '2026-06-05', to: '2026-07-05' });
    // Adjacent windows meet at a shared boundary day rather than leaving a gap,
    // so stepping back never skips a weigh-in.
    expect(previous.to).toBe(current.from);
  });

  it('given several steps back, when stepped again, then each step is one more period', () => {
    const twoBack = shiftRange(
      shiftRange(presetRange('30D', NOW), -1, NOW),
      -1,
      NOW,
    );
    expect(twoBack.to).toBe('2026-06-05');

    expect(shiftRange(presetRange('1Y', NOW), -1, NOW)).toEqual({
      from: '2024-08-04',
      to: '2025-08-04',
    });
  });

  it('given a past window, when stepped forward, then it returns to where it came from', () => {
    const current = presetRange('7D', NOW);
    expect(shiftRange(shiftRange(current, -1, NOW), 1, NOW)).toEqual(current);
  });

  it('given a window whose end is nearer than its own length, when stepped forward, then it stops at today', () => {
    // A hand-picked 90-day window ending two days ago has two days of room
    // ahead of it, not ninety. Shifting by the full span would put `to` in the
    // future, where the journal has nothing.
    expect(
      shiftRange({ from: '2026-05-04', to: '2026-08-02' }, 1, NOW),
    ).toEqual({ from: '2026-05-06', to: '2026-08-04' });
  });
});

describe('canStepForward', () => {
  it('given a window ending today, when asked whether it can step forward, then it cannot', () => {
    // Forward from "now" is the future, and the journal has nothing there.
    expect(canStepForward(presetRange('30D', NOW), NOW)).toBe(false);
  });

  it('given a past window, when asked whether it can step forward, then it can', () => {
    expect(canStepForward({ from: '2026-06-05', to: '2026-07-05' }, NOW)).toBe(
      true,
    );
  });
});

describe('matchPreset', () => {
  it('given a preset’s own window, when matched, then it names that preset', () => {
    for (const preset of WEIGHT_RANGE_PRESETS) {
      expect(matchPreset(presetRange(preset, NOW), NOW)).toBe(preset);
    }
  });

  it('given a window the reader picked by hand, when matched, then no preset claims it', () => {
    // The point of deriving this rather than storing it: the preset row must
    // not read "30 days" over a fortnight somebody chose from the calendar.
    expect(matchPreset({ from: '2026-07-20', to: '2026-08-03' }, NOW)).toBe(
      null,
    );
  });

  it('given a preset-length window stepped into the past, when matched, then no preset claims it', () => {
    // Same length as 30D, but it does not end today — "30 days" means the last
    // thirty, so a window that closed a month ago is not it.
    expect(matchPreset(shiftRange(presetRange('30D', NOW), -1, NOW), NOW)).toBe(
      null,
    );
  });
});

describe('rangeLabel', () => {
  it('given the current 30D window, when labelled, then it names both ends', () => {
    expect(rangeLabel(presetRange('30D', NOW))).toBe('Jul 5 – Aug 4');
  });

  it('given a window spanning a year boundary, when labelled, then the years are distinguishable', () => {
    // "Aug 4 – Aug 4" would be unreadable on the 1Y window, which is exactly
    // the span where both ends share a month and day.
    expect(rangeLabel(presetRange('1Y', NOW))).toBe(
      'Aug 4, 2025 – Aug 4, 2026',
    );
  });
});

describe('weightRangeFrom', () => {
  const fallback = presetRange(DEFAULT_RANGE_PRESET, NOW);

  it('given a well-formed window in the past, when read, then it is honoured', () => {
    expect(weightRangeFrom('2026-06-05', '2026-07-05', NOW)).toEqual({
      from: '2026-06-05',
      to: '2026-07-05',
    });
  });

  it('given no parameters at all, when read, then the default window stands', () => {
    expect(weightRangeFrom(undefined, undefined, NOW)).toEqual(fallback);
    expect(weightRangeFrom(null, null, NOW)).toEqual(fallback);
  });

  it('given only one end, when read, then the default window stands', () => {
    // Half a window is not a window: the other end would have to be invented,
    // and any invention here is a span the reader did not ask for.
    expect(weightRangeFrom('2026-06-05', undefined, NOW)).toEqual(fallback);
    expect(weightRangeFrom(undefined, '2026-07-05', NOW)).toEqual(fallback);
  });

  it('given a repeated key, when read, then the default window stands', () => {
    // `searchParams` hands an array for `?from=a&from=b`, which names no day.
    expect(
      weightRangeFrom(['2026-06-05', '2026-06-06'], '2026-07-05', NOW),
    ).toEqual(fallback);
  });

  it('given a value that is not a day, when read, then the default window stands', () => {
    expect(weightRangeFrom('yesterday', '2026-07-05', NOW)).toEqual(fallback);
    expect(weightRangeFrom('2026-6-5', '2026-07-05', NOW)).toEqual(fallback);
    // Shaped like a day, but no such day exists.
    expect(weightRangeFrom('2026-02-30', '2026-07-05', NOW)).toEqual(fallback);
  });

  it('given the ends the wrong way round, when read, then the default window stands', () => {
    expect(weightRangeFrom('2026-07-05', '2026-06-05', NOW)).toEqual(fallback);
  });

  it('given both ends on one day, when read, then the default window stands', () => {
    // Every change figure under a one-day window compares a reading against
    // itself, which is why the calendar refuses to commit one either.
    expect(weightRangeFrom('2026-07-05', '2026-07-05', NOW)).toEqual(fallback);
  });

  it('given a window ending in the future, when read, then the default window stands', () => {
    // The journal has nothing past today, and an axis drawn to next year
    // squashes every real reading into a corner.
    expect(weightRangeFrom('2026-08-01', '2026-12-31', NOW)).toEqual(fallback);
  });

  it('given a window ending today, when read, then it is honoured', () => {
    // The boundary the future check must not catch.
    expect(weightRangeFrom('2026-08-01', '2026-08-04', NOW)).toEqual({
      from: '2026-08-01',
      to: '2026-08-04',
    });
  });
});
