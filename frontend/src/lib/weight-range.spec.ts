import { describe, expect, it } from 'vitest';
import {
  RANGE_DAYS,
  WEIGHT_RANGE_PRESETS,
  canStepForward,
  rangeLabel,
  weightRangeBounds,
} from './weight-range';

// Fixed instant, mid-day UTC, so nothing here depends on when the suite runs.
// Mid-day rather than midnight on purpose: the bounds are UTC calendar days, so
// a noon `now` proves the time-of-day is discarded rather than rounding a
// boundary by luck.
const NOW = new Date('2026-08-04T12:00:00Z');

describe('weightRangeBounds', () => {
  it('given the 30D preset at the current window, when bounds are computed, then it ends today and starts 30 days back', () => {
    expect(weightRangeBounds('30D', 0, NOW)).toEqual({
      from: '2026-07-05',
      to: '2026-08-04',
    });
  });

  it('given each preset at the current window, when bounds are computed, then every window ends today', () => {
    for (const preset of WEIGHT_RANGE_PRESETS) {
      expect(weightRangeBounds(preset, 0, NOW).to).toBe('2026-08-04');
    }
  });

  it('given the longer presets, when bounds are computed, then the span matches the preset length', () => {
    expect(weightRangeBounds('3M', 0, NOW).from).toBe('2026-05-06');
    expect(weightRangeBounds('6M', 0, NOW).from).toBe('2026-02-05');
    expect(weightRangeBounds('1Y', 0, NOW).from).toBe('2025-08-04');
  });

  it('given one step back, when bounds are computed, then the window moves a whole period and abuts the current one', () => {
    const current = weightRangeBounds('30D', 0, NOW);
    const previous = weightRangeBounds('30D', -1, NOW);

    expect(previous).toEqual({ from: '2026-06-05', to: '2026-07-05' });
    // Adjacent windows meet at a shared boundary day rather than leaving a gap,
    // so stepping back never skips a weigh-in.
    expect(previous.to).toBe(current.from);
  });

  it('given several steps back, when bounds are computed, then each step is one more period', () => {
    expect(weightRangeBounds('30D', -2, NOW).to).toBe('2026-06-05');
    expect(weightRangeBounds('1Y', -1, NOW)).toEqual({
      from: '2024-08-04',
      to: '2025-08-04',
    });
  });

  it('given a range older than the dashboard’s fixed 60-day window, when bounds are computed, then it is still reachable', () => {
    // The ticket's Done-when: "An entry older than 60 days is reachable." The
    // dashboard provider fetches a fixed 60 days; these bounds are what let the
    // page ask for anything older.
    const { from } = weightRangeBounds('1Y', 0, NOW);
    expect(from < '2026-06-05').toBe(true);
  });

  it('given any preset, when its length is read, then it is a whole number of days', () => {
    for (const preset of WEIGHT_RANGE_PRESETS) {
      expect(Number.isInteger(RANGE_DAYS[preset])).toBe(true);
      expect(RANGE_DAYS[preset]).toBeGreaterThan(0);
    }
  });
});

describe('canStepForward', () => {
  it('given the current window, when asked whether it can step forward, then it cannot', () => {
    // Forward from "now" is the future, and the journal has nothing there.
    expect(canStepForward(0)).toBe(false);
  });

  it('given a past window, when asked whether it can step forward, then it can', () => {
    expect(canStepForward(-1)).toBe(true);
    expect(canStepForward(-12)).toBe(true);
  });
});

describe('rangeLabel', () => {
  it('given the current 30D window, when labelled, then it names both ends', () => {
    expect(rangeLabel('30D', 0, NOW)).toBe('Jul 5 – Aug 4');
  });

  it('given a window spanning a year boundary, when labelled, then the years are distinguishable', () => {
    // "Aug 4 – Aug 4" would be unreadable on the 1Y window, which is exactly
    // the span where both ends share a month and day.
    expect(rangeLabel('1Y', 0, NOW)).toBe('Aug 4, 2025 – Aug 4, 2026');
  });
});
