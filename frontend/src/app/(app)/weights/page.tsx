import type { Metadata } from 'next';
import NumberFlow from '@number-flow/react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ChartCard } from '@/components/chart-card';
import { StatCard, StatFigure } from '@/components/stat-card';
import { StatChip } from '@/components/stat-chip';
import { WeightHistoryRow } from '@/components/weight-history-row';
import { WeightTrendChart } from '@/components/weight-trend-chart';
import { WeightRangeNav } from '@/components/weight-range-nav';
import {
  addDays,
  buildWeightTrend,
  formatTrendDate,
  todayUtc,
  utcDay,
  weightAsOf,
  weightChangeOverDays,
} from '@/lib/dashboard-transforms';
import { getDashboard, listWeights } from '@/lib/server/reads';
import { requireOnboarded } from '@/lib/server/session';
import {
  RANGE_FROM_PARAM,
  RANGE_TO_PARAM,
  rangeLabel,
  weightRangeFrom,
} from '@/lib/weight-range';

export const metadata: Metadata = {
  title: 'Weight History — FoodNote',
};

/** The change table's rows, shortest span first. */
const CHANGE_PERIODS = [3, 7, 14, 30] as const;

/**
 * How far *before* the visible range to fetch, so the figures below the chart
 * can be computed at all.
 *
 * Every change figure is carry-forward: it needs the last reading at or before
 * `rangeEnd - days`. On the 30D preset that anchor sits exactly on the window's
 * first day, so a fetch bounded by the window itself has nothing to carry
 * forward from and the 30-day row read "Not enough history" even with a full
 * month of weigh-ins on screen. The same gap made `weightAsOf` fall back to
 * *today's* weight on a past window, which is the one number a past window must
 * not show.
 */
const LOOKBACK_DAYS = Math.max(...CHANGE_PERIODS);

/**
 * The weight journal at any span, not the dashboard's fixed 60 days: `?from=`
 * and `?to=` set the bounds on `GET /weights`, and the chart, the change figures
 * and the entry list are all read from that one fetch, so they can never
 * describe different windows.
 *
 * A Server Component. It was a client page holding the range in `useState` and
 * fetching through `useWeightsInRange` — both are gone: the range is in the URL,
 * so stepping it is a navigation the server answers, and the goal it needs for
 * the carry-forward anchor comes from `requireOnboarded()` rather than from
 * `MealsProvider`. The reload the hook exposed is gone too, because the weight
 * actions `refresh()` the route that drew the entry they changed.
 *
 * No `'use client'`: this composes, it does not interact. Every part that needs
 * a browser — the range nav, the chart, a NumberFlow digit, a history row's
 * drawer — declares it for itself and becomes its own boundary.
 */
export default async function WeightsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // One `now` for the whole render, so the bounds, the labels and the change
  // anchors below cannot land on different instants.
  const now = new Date();
  const params = await searchParams;
  const range = weightRangeFrom(
    params[RANGE_FROM_PARAM],
    params[RANGE_TO_PARAM],
    now,
  );

  // `GET /dashboard` 404s until onboarding is finished, so the guard has to come
  // first — and it costs nothing, being the same memoized goal read.
  await requireOnboarded();

  const [dashboard, history] = await Promise.all([
    // For one number: the weight the server holds, which is what every figure
    // falls back to when the journal has nothing at or before the window's end.
    // It lives on the dashboard's goal block rather than on `GET /goals/current`,
    // and `date` scopes only that response's meal window (ADR-0005), so today is
    // the right day to ask for — the same day `GoalReachedGate` asks for, which
    // means the memo makes this read free between them.
    getDashboard(todayUtc(now)),
    // Fetched wider than shown — see LOOKBACK_DAYS. `history` is every reading
    // the figures are derived from; `visible` is the window the reader asked for.
    listWeights(addDays(range.from, -LOOKBACK_DAYS), range.to),
  ]);

  // One chain, newest first. `visible` is the same array: buildWeightTrend sorts
  // its own input, so the order it receives does not matter, and the entry list
  // wants newest first anyway.
  const visible = history
    .filter((entry) => utcDay(entry.recordedAt) >= range.from)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

  // Every figure is anchored to the end of the selected range, not to this
  // moment — on a past window "the last 7 days" means the seven days before
  // that window closed, which is what the chart beside it draws.
  const rangeEnd = new Date(`${range.to}T23:59:59.999Z`);
  const currentWeightKg = weightAsOf(
    history,
    rangeEnd,
    dashboard.goal.currentWeightKg,
  );
  // The projection is deliberately dropped here, unlike the dashboard's card:
  // its endpoint is the goal date, which on a 30D window lies months past `to`,
  // and including it stretched the axis so far that a month of real readings
  // was squashed into the left third under a label reading "Jul 5 – Aug 4".
  // This page's subject is the window; the plan is the dashboard's.
  const trend = buildWeightTrend(
    visible,
    {
      currentWeightKg,
      targetWeightKg: currentWeightKg,
      projectedGoalDate: null,
    },
    rangeEnd,
  );
  // Last reading minus first, across what is actually plotted — not
  // weightChangeOverDays, which is carry-forward and so needs a reading at or
  // before the window's first day. On the 30D preset that anchor is the window's
  // own start, so the chip read "no earlier weigh-in to compare against" with a
  // month of weigh-ins drawn directly beneath it. The change table below is
  // still carry-forward, because a "7-day change" genuinely is a fixed period
  // rather than the span on screen.
  const oldestVisible = visible.at(-1);
  const newestVisible = visible.at(0);
  const rangeChange =
    oldestVisible && newestVisible && oldestVisible.id !== newestVisible.id
      ? Math.round((newestVisible.weightKg - oldestVisible.weightKg) * 10) / 10
      : null;

  return (
    // `lg:gap-4`, as the dashboard's column has: from 1024 the cards tighten
    // against each other so a screen holds more of the journal, and the two
    // routes are read one after the other.
    <div className="flex w-full flex-col gap-5 lg:gap-4">
      <div className="flex justify-center">
        <WeightRangeNav range={range} now={now} />
      </div>

      {/* Paired from `lg`, so the two short cards sit beside each other
          instead of each spanning the content column on its own. The chart
          and the entry list below stay full width: one is a plot that reads
          better wide, the other is a list. */}
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-3.5">
        <StatCard label="Current weight">
          {/* NumberFlow has no accessible name of its own, so the figure is
              spoken here once and the visual parts are hidden — the pattern
              the dashboard's stat cards already use. */}
          <span className="sr-only">
            {`Current weight: ${currentWeightKg} kg`}
          </span>
          {/* Animated because the range control changes it: stepping from one
              window to the next moves this figure, and the digits carrying
              that motion is what says the two readings are the same measure
              at two times. */}
          <StatFigure unit="kg">
            <NumberFlow value={currentWeightKg} />
          </StatFigure>
          <DirectionChip changeKg={rangeChange} />
          <p className="text-sm text-muted-foreground tabular-nums">
            {rangeLabel(range)}
          </p>
        </StatCard>

        {/* The same shell as the card beside it, not a hand-built one. Paired in
            a two-column row, the two were visibly different objects: this one
            stood at `p-5` against its neighbour's `p-4`, and its heading was
            full-strength foreground where every stat card's is muted. */}
        <StatCard label="Change over time">
          {/* A term/value list, not a table: each row is one period and its
              one figure, with no second column to align against. */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
            {CHANGE_PERIODS.map((days) => {
              const change = weightChangeOverDays(
                history,
                currentWeightKg,
                rangeEnd,
                days,
              );
              return (
                <div key={days} className="flex flex-col gap-0.5">
                  <dt className="text-sm text-muted-foreground">{days} days</dt>
                  <dd className="text-base font-semibold tabular-nums">
                    {change === null ? (
                      // Not "0.0 kg": the journal has nothing that far back,
                      // which is a different statement from no change.
                      <span className="font-normal text-muted-foreground">
                        Not enough history
                      </span>
                    ) : (
                      `${change > 0 ? '+' : ''}${change} kg`
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </StatCard>
      </div>

      {/* The shell the dashboard's three chart cards use, rather than this
          page's own copy of it — which had drifted to a wider horizontal
          padding than the identical chart draws in over there. */}
      <ChartCard
        className="h-72"
        title="Weight trend"
        subtitle={
          visible.length === 0
            ? 'No weigh-ins in this range'
            : `${visible.length} ${visible.length === 1 ? 'weigh-in' : 'weigh-ins'}, dotted line is the trend through them`
        }
      >
        <WeightTrendChart
          className="aspect-auto min-h-0 w-full grow basis-0"
          data={trend}
        />
      </ChartCard>

      {/* `gap-4`, the rhythm ChartCard above sets, so the page has one gap
          between a card's heading and its body rather than two. `p-4`, not
          `p-5`: the rows inside carry their own `px-4`, and at `p-5` a row's
          text stood at 36px against a heading at 20px — a step visible on
          every entry. At `p-4` the two land on 32 and 16, the same nesting
          /meals has. */}
      <Card className="gap-4 p-4">
        <h2 className="text-base font-semibold">Weight log entries</h2>
        {visible.length === 0 ? (
          // A dashed edge, as /meals' empty state has: without one the line
          // of text floats in a card that looks like it failed to load.
          <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
            No weigh-ins between{' '}
            {formatTrendDate(Date.parse(`${range.from}T00:00:00Z`))} and{' '}
            {formatTrendDate(Date.parse(`${range.to}T00:00:00Z`))}.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {visible.map((entry) => (
              <WeightHistoryRow
                key={entry.id}
                entry={entry}
                // A claim about this range, not about the journal: with one
                // entry in view the page cannot tell whether it is the last
                // one overall, so it does not offer the delete. The rule
                // belongs in the service — see the PR notes.
                canDelete={visible.length > 1}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/**
 * Which way the weight moved across the whole selected range.
 *
 * Neutral in both directions: this page browses the journal rather than judging
 * it, and which way is "good" depends on a goal the range says nothing about.
 * The dashboard's card is where a direction gets read against the plan.
 */
function DirectionChip({ changeKg }: { changeKg: number | null }) {
  if (changeKg === null) {
    return (
      <p className="text-sm text-muted-foreground">
        No earlier weigh-in to compare against
      </p>
    );
  }

  const moving = changeKg !== 0;
  const Arrow = changeKg < 0 ? ArrowDown : ArrowUp;

  return (
    <StatChip tone="neutral">
      <span className="sr-only">
        {`Change over this range: ${changeKg} kg, ${
          changeKg < 0 ? 'decreasing' : changeKg > 0 ? 'increasing' : 'holding'
        }`}
      </span>
      {moving && <Arrow aria-hidden="true" className="size-3.5" />}
      <span aria-hidden="true">
        {moving ? (
          <>
            <NumberFlow value={Math.abs(changeKg)} suffix=" kg" />
            {changeKg < 0 ? ' decreasing' : ' increasing'}
          </>
        ) : (
          'Holding'
        )}
      </span>
    </StatChip>
  );
}
