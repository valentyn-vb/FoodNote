'use client';

import { useState } from 'react';
import NumberFlow from '@number-flow/react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard, StatFigure } from '@/components/stat-card';
import { StatChip } from '@/components/stat-chip';
import { WeightHistoryRow } from '@/components/weight-history-row';
import { WeightTrendChart } from '@/components/weight-trend-chart';
import {
  WeightRangeNav,
  type WeightRangeSelection,
} from '@/components/weight-range-nav';
import {
  addDays,
  buildWeightTrend,
  formatTrendDate,
  utcDay,
  weightAsOf,
  weightChangeOverDays,
} from '@/lib/dashboard-transforms';
import { useMeals } from '@/lib/meals-context';
import { rangeLabel, weightRangeBounds } from '@/lib/weight-range';
import { useWeightsInRange } from './use-weights-in-range';

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
 * The weight journal at any span, not the dashboard's fixed 60 days: the range
 * control sets `from`/`to` on `GET /weights`, and the chart, the change figures
 * and the entry list are all read from that one fetch, so they can never
 * describe different windows.
 *
 * A client component, unlike the server-first direction of #86: the range is
 * interactive view state, and the two sibling pages (/dashboard, /meals) read
 * their data from the same client providers this one sits inside — it needs the
 * goal block from MealsProvider for the projection line. Moving this to
 * searchParams and a server fetch is a real option once those providers move.
 */
export default function WeightsPage() {
  const [selection, setSelection] = useState<WeightRangeSelection>({
    preset: '30D',
    offset: 0,
  });
  // One `now` for the whole render, so the bounds, the labels and the change
  // anchors below cannot land on different instants.
  const [now] = useState(() => new Date());

  const range = weightRangeBounds(selection.preset, selection.offset, now);
  // Fetched wider than shown — see LOOKBACK_DAYS. `history` is every reading the
  // figures are derived from; `visible` is the window the reader asked for.
  const {
    entries: history,
    status,
    reload,
  } = useWeightsInRange({
    from: addDays(range.from, -LOOKBACK_DAYS),
    to: range.to,
  });
  const { goal } = useMeals();

  const visible = history.filter(
    (entry) => utcDay(entry.recordedAt) >= range.from,
  );

  // Every figure is anchored to the end of the selected range, not to this
  // moment — on a past window "the last 7 days" means the seven days before
  // that window closed, which is what the chart beside it draws.
  const rangeEnd = new Date(`${range.to}T23:59:59.999Z`);
  const currentWeightKg = goal
    ? weightAsOf(history, rangeEnd, goal.currentWeightKg)
    : 0;
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
  const newest = [...visible].sort((a, b) =>
    b.recordedAt.localeCompare(a.recordedAt),
  );

  // Last reading minus first, across what is actually plotted — not
  // weightChangeOverDays, which is carry-forward and so needs a reading at or
  // before the window's first day. On the 30D preset that anchor is the window's
  // own start, so the chip read "no earlier weigh-in to compare against" with a
  // month of weigh-ins drawn directly beneath it. The change table below is
  // still carry-forward, because a "7-day change" genuinely is a fixed period
  // rather than the span on screen.
  const oldestVisible = newest.at(-1);
  const newestVisible = newest.at(0);
  const rangeChange =
    oldestVisible && newestVisible && oldestVisible.id !== newestVisible.id
      ? Math.round((newestVisible.weightKg - oldestVisible.weightKg) * 10) / 10
      : null;

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex justify-center">
        <WeightRangeNav
          preset={selection.preset}
          offset={selection.offset}
          now={now}
          onChange={setSelection}
        />
      </div>

      {status === 'error' ? (
        <WeightsError onRetry={reload} />
      ) : status === 'loading' ? (
        <WeightsSkeleton />
      ) : (
        <>
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
              {rangeLabel(selection.preset, selection.offset, now)}
            </p>
          </StatCard>

          <Card className="h-72 gap-4 p-5">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-semibold">Weight trend</h2>
              <p className="text-sm text-muted-foreground">
                {visible.length === 0
                  ? 'No weigh-ins in this range'
                  : `${visible.length} ${visible.length === 1 ? 'weigh-in' : 'weigh-ins'}, dotted line is the trend through them`}
              </p>
            </div>
            <WeightTrendChart
              className="aspect-auto min-h-0 w-full grow basis-0"
              data={trend}
            />
          </Card>

          <Card className="gap-3 p-5">
            <h2 className="text-base font-semibold">Change over time</h2>
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
                    <dt className="text-sm text-muted-foreground">
                      {days} days
                    </dt>
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
          </Card>

          <Card className="gap-3 p-5">
            <h2 className="text-base font-semibold">Entries</h2>
            {newest.length === 0 ? (
              // A dashed edge, as /meals' empty state has: without one the line
              // of text floats in a card that looks like it failed to load.
              <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                No weigh-ins between{' '}
                {formatTrendDate(Date.parse(`${range.from}T00:00:00Z`))} and{' '}
                {formatTrendDate(Date.parse(`${range.to}T00:00:00Z`))}.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {newest.map((entry) => (
                  <WeightHistoryRow
                    key={entry.id}
                    entry={entry}
                    // A claim about this range, not about the journal: with one
                    // entry in view the page cannot tell whether it is the last
                    // one overall, so it does not offer the delete. The rule
                    // belongs in the service — see the PR notes.
                    canDelete={newest.length > 1}
                    onChanged={reload}
                  />
                ))}
              </div>
            )}
          </Card>
        </>
      )}
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

function WeightsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <span className="text-sm text-muted-foreground">
        Couldn&apos;t load your weight history.
      </span>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

/** The shape the page settles into, so nothing reflows once the range lands. */
function WeightsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-28 w-full rounded-lg" />
      <Skeleton className="h-72 w-full rounded-lg" />
      <Skeleton className="h-28 w-full rounded-lg" />
    </div>
  );
}
