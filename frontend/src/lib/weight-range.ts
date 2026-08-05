import { addDays, todayUtc } from './dashboard-transforms';

/**
 * The weights page's range control: which span of the journal is on screen.
 *
 * Separate from dashboard-transforms because the dashboard's window is a fixed
 * 60 days it never lets the reader move (WEIGHT_WINDOW_DAYS), while this page's
 * whole point is stepping the window — so the two have no shared state, only
 * the same UTC date arithmetic, which is imported rather than restated.
 *
 * The state is the range itself, not a preset and an offset. A reader can pick
 * their own two dates from the calendar, which no (preset, offset) pair can
 * name; deriving the pressed preset from the range instead means a custom pick
 * deselects the row for free, rather than the two having to be kept agreeing.
 */
export const WEIGHT_RANGE_PRESETS = [
  '7D',
  '30D',
  '3M',
  '6M',
  '1Y',
  'All',
] as const;

export type WeightRangePreset = (typeof WEIGHT_RANGE_PRESETS)[number];

/**
 * Preset lengths in whole days, not calendar months. "All" is absent because it
 * has no length: see presetRange.
 *
 * A rolling window, matching weightChangeOverDays: "3M" is 90 days ending
 * today, not "the 1st of three months ago". Calendar months would make the
 * window's length depend on which months it happens to cross — 89 days across
 * February, 92 across summer — so two readings of "3M" taken weeks apart would
 * describe spans of different lengths, and the change figures under them would
 * not be comparable.
 */
export const RANGE_DAYS: Record<Exclude<WeightRangePreset, 'All'>, number> = {
  '7D': 7,
  '30D': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
};

/**
 * Long labels for desktop, where there is room to say what a preset means. The
 * short forms stay on narrow screens, where six full labels do not fit a row.
 */
export const RANGE_LABELS: Record<WeightRangePreset, string> = {
  '7D': '7 days',
  '30D': '30 days',
  '3M': '3 months',
  '6M': '6 months',
  '1Y': '1 year',
  All: 'All time',
};

/**
 * Where the "All" window starts.
 *
 * A fixed floor rather than the first weigh-in, which the page cannot know
 * without first fetching the whole journal — the request this window exists to
 * make. It only has to predate any entry the journal can hold, and FoodNote did
 * not exist in 2020. The chart crops to the weigh-ins it actually finds, so the
 * empty years in front of them are never drawn.
 */
const JOURNAL_FLOOR = '2020-01-01';

/** Inclusive UTC day bounds for `GET /weights?from&to`. */
export type WeightRange = { from: string; to: string };

const DAY_MS = 86_400_000;

/** Whole days from `from` to `to` — the window's own length, and its step. */
export function rangeDays({ from, to }: WeightRange): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS,
  );
}

/** The window a preset names: its length back from today, or the whole journal. */
export function presetRange(preset: WeightRangePreset, now: Date): WeightRange {
  const to = todayUtc(now);
  return {
    from: preset === 'All' ? JOURNAL_FLOOR : addDays(to, -RANGE_DAYS[preset]),
    to,
  };
}

/**
 * Which preset this range *is*, or null when the reader picked their own dates.
 *
 * Derived rather than stored, so the preset row can never claim "30 days" over
 * a window the reader narrowed by hand — the contradiction the call was about.
 * Compared as whole ranges rather than by length, so "All", which has no
 * length, needs no case of its own.
 */
export function matchPreset(
  range: WeightRange,
  now: Date,
): WeightRangePreset | null {
  return (
    WEIGHT_RANGE_PRESETS.find((preset) => {
      const candidate = presetRange(preset, now);
      return candidate.from === range.from && candidate.to === range.to;
    }) ?? null
  );
}

/**
 * The window moved one of its own lengths back, or forward.
 *
 * Adjacent windows share a boundary day rather than leaving a one-day gap
 * between them, so stepping back through the journal can never skip a weigh-in.
 * Forward is clamped to today: a 90-day window whose end is two days back has
 * two days of room, not ninety, and the journal has nothing past today.
 */
export function shiftRange(
  range: WeightRange,
  direction: -1 | 1,
  now: Date,
): WeightRange {
  const span = rangeDays(range);
  const step =
    direction < 0
      ? -span
      : Math.min(span, rangeDays({ from: range.to, to: todayUtc(now) }));
  return { from: addDays(range.from, step), to: addDays(range.to, step) };
}

/**
 * Whether the window can move forward. False once it ends today: forward from
 * there is the future, where the journal has nothing to show.
 */
export function canStepForward(range: WeightRange, now: Date): boolean {
  return range.to < todayUtc(now);
}

/**
 * Whether the window can move back. False at the journal floor, which "All"
 * starts from: a window already holding every entry has no earlier one, and
 * stepping would open a span of years the journal cannot reach into.
 */
export function canStepBack(range: WeightRange): boolean {
  return range.from > JOURNAL_FLOOR;
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
 * A calendar cell's date as the day string the API takes.
 *
 * react-day-picker works in local midnight, so `toISOString().slice(0, 10)` —
 * what the rest of this app does to a `Date` — names the day *before* for any
 * viewer east of UTC: tapping Aug 1 in Berlin fetched Jul 31. The day the
 * reader tapped is the one printed on the cell, which is its local parts.
 */
export function calendarDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * The inverse, for the calendar's `disabled` bound and its opening month: a
 * UTC-midnight `Date` would be a different *day* to the cells it is compared
 * against, and west of UTC that disabled today.
 */
export function calendarDate(day: string): Date {
  return new Date(`${day}T00:00:00`);
}

/**
 * The window in words, for under the hero figure — "Jul 5 – Aug 4".
 *
 * The year appears only when the two ends fall in different ones, which is
 * exactly the case that needs it: the 1Y window's ends share a month and a day,
 * so without the year it reads "Aug 4 – Aug 4".
 */
export function rangeLabel({ from, to }: WeightRange): string {
  const format =
    from.slice(0, 4) === to.slice(0, 4) ? utcMonthDay : utcMonthDayYear;
  const day = (iso: string) => format.format(new Date(`${iso}T00:00:00Z`));
  return `${day(from)} – ${day(to)}`;
}

/**
 * What the window is called on screen.
 *
 * "All time" for the whole-journal window, because its bounds are a floor date
 * and today: spelling them out would read "Jan 1, 2020 – Aug 5, 2026" and
 * promise years of history that nobody logged.
 */
export function windowLabel(range: WeightRange, now: Date): string {
  return matchPreset(range, now) === 'All' ? 'All time' : rangeLabel(range);
}
