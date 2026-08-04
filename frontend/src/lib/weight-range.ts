import { addDays, todayUtc } from './dashboard-transforms';

/**
 * The weights page's range control: which span of the journal is on screen.
 *
 * Separate from dashboard-transforms because the dashboard's window is a fixed
 * 60 days it never lets the reader move (WEIGHT_WINDOW_DAYS), while this page's
 * whole point is stepping the window — so the two have no shared state, only
 * the same UTC date arithmetic, which is imported rather than restated.
 */
export const WEIGHT_RANGE_PRESETS = ['30D', '3M', '6M', '1Y'] as const;

export type WeightRangePreset = (typeof WEIGHT_RANGE_PRESETS)[number];

/**
 * Preset lengths in whole days, not calendar months.
 *
 * A rolling window, matching weightChangeOverDays: "3M" is 90 days ending
 * today, not "the 1st of three months ago". Calendar months would make the
 * window's length depend on which months it happens to cross — 89 days across
 * February, 92 across summer — so two readings of "3M" taken weeks apart would
 * describe spans of different lengths, and the change figures under them would
 * not be comparable.
 */
export const RANGE_DAYS: Record<WeightRangePreset, number> = {
  '30D': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
};

export type WeightRange = { from: string; to: string };

/**
 * Inclusive UTC day bounds for `GET /weights?from&to`.
 *
 * `offset` counts whole periods back from the current window: 0 is the window
 * ending today, -1 the period before it, and so on. Adjacent windows share a
 * boundary day rather than leaving a one-day gap between them, so stepping back
 * through the journal can never skip a weigh-in.
 */
export function weightRangeBounds(
  preset: WeightRangePreset,
  offset: number,
  now: Date,
): WeightRange {
  const days = RANGE_DAYS[preset];
  const to = addDays(todayUtc(now), offset * days);
  return { from: addDays(to, -days), to };
}

/**
 * Whether the window can move forward. False at offset 0: forward from the
 * current window is the future, where the journal has nothing to show.
 */
export function canStepForward(offset: number): boolean {
  return offset < 0;
}

// Built once at module scope, as in dashboard-transforms: Intl.DateTimeFormat
// construction is the expensive half, and the hero re-renders this label on
// every range change.
const utcMonthDay = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const utcMonthDayYear = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * The window in words, for under the hero figure — "Jul 5 – Aug 4".
 *
 * The year appears only when the two ends fall in different ones, which is
 * exactly the case that needs it: the 1Y window's ends share a month and a day,
 * so without the year it reads "Aug 4 – Aug 4".
 */
export function rangeLabel(
  preset: WeightRangePreset,
  offset: number,
  now: Date,
): string {
  const { from, to } = weightRangeBounds(preset, offset, now);
  const format =
    from.slice(0, 4) === to.slice(0, 4) ? utcMonthDay : utcMonthDayYear;
  const day = (iso: string) => format.format(new Date(`${iso}T00:00:00Z`));
  return `${day(from)} – ${day(to)}`;
}
