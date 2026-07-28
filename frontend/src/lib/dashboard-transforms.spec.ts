import { describe, it, expect } from 'vitest';
import { addDays, isFutureDay, formatDayLabel } from './dashboard-transforms';

// Fixed anchor used throughout — a Tuesday so "yesterday" is Monday.
const NOW = new Date('2024-07-30T12:00:00Z'); // 2024-07-30, Tuesday

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
    // A date that is future relative to one "now" but past relative to another.
    const earlier = new Date('2024-07-28T12:00:00Z');
    const later = new Date('2024-07-31T12:00:00Z');
    expect(isFutureDay('2024-07-30', earlier)).toBe(true);
    expect(isFutureDay('2024-07-30', later)).toBe(false);
  });
});

describe('formatDayLabel', () => {
  it('returns "Today" for the same UTC day as now', () => {
    expect(formatDayLabel('2024-07-30', NOW)).toBe('Today');
  });

  it('returns "Yesterday" for one day before', () => {
    expect(formatDayLabel('2024-07-29', NOW)).toBe('Yesterday');
  });

  it('returns a formatted date for two days ago', () => {
    // 2024-07-28 is a Sunday
    expect(formatDayLabel('2024-07-28', NOW)).toBe('Sun, Jul 28');
  });

  it('returns a formatted date for a date in a different month', () => {
    // 2024-06-15 is a Saturday
    expect(formatDayLabel('2024-06-15', NOW)).toBe('Sat, Jun 15');
  });

  it('never returns "Today" or "Yesterday" for older dates', () => {
    const label = formatDayLabel('2024-01-01', NOW);
    expect(label).not.toBe('Today');
    expect(label).not.toBe('Yesterday');
  });

  it('handles year boundaries — 2023-12-31 is not "Yesterday" relative to 2024-01-02', () => {
    const jan2 = new Date('2024-01-02T12:00:00Z');
    expect(formatDayLabel('2023-12-31', jan2)).not.toBe('Yesterday');
    expect(formatDayLabel('2024-01-01', jan2)).toBe('Yesterday');
  });
});