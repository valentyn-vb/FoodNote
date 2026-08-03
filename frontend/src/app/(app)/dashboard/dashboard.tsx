'use client';

import { DayNav } from '@/components/day-nav';
import { Disclaimer } from '@/components/disclaimer';
import { MealGroupsAccordion } from '@/components/meal-groups-accordion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DailyCaloriesChart, WeightTrendChart } from '@/components/charts';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatGoalDate, weeksUntil } from '@/lib/dashboard-transforms';
import { useMeals } from '@/lib/meals-context';
import { useWeight } from '@/lib/weight-context';
import NumberFlow from '@number-flow/react';
import { History } from 'lucide-react';
import Image from 'next/image';
import { EmptyMeals } from './empty-meals';
import { fullnessMascot, spokenStat } from './helpers';
import { StatWidget } from './stat-widget';
import { DashboardError, DashboardSkeleton, InlineError } from './states';
import { useDashboardGate } from './use-dashboard-gate';
import { WeightHistoryDrawer } from './weight-history-drawer';

// The label and the value are one decision, not two: they used to branch on the
// same thing twice — once as `=== null`, once as `!` — and had to agree.
function goalStat(goal: {
  reachedTarget: boolean;
  projectedGoalDate: string | null;
}) {
  if (goal.reachedTarget)
    return { label: 'Goal', value: 'You hit your target' };
  if (goal.projectedGoalDate === null)
    return { label: 'Goal', value: 'Maintaining your weight' };
  return {
    label: 'Projected goal date',
    value: `${formatGoalDate(goal.projectedGoalDate)} · ${weeksUntil(goal.projectedGoalDate, new Date())} wks`,
  };
}

/**
 * The day's numbers, in six blocks and one DOM. Three bands at `lg` — the
 * numbers, the two charts side by side, the meal list full width — stacked in
 * source order below it.
 *
 * The two charts share a band because a narrow right-hand column was starving
 * the 7-day one: at 1024 it had 188px, under the width at which recharts starts
 * dropping weekday labels (#123). Equal columns give it about 340px there.
 */
export function Dashboard() {
  const {
    eatenKcal,
    remainingKcal,
    progressPct,
    goalKcal,
    selectedDayMeals,
    dailyCalories,
    isToday,
  } = useMeals();
  const {
    status: weightStatus,
    retry: retryWeight,
    entries: weightEntries,
    weightTrend,
    weightChangeKg,
    onWeightsChanged,
  } = useWeight();

  const gate = useDashboardGate();
  const weightReady = weightStatus === 'ready';

  const remainingLabel = isToday ? 'Remaining today' : 'Remaining';
  const eatenLabel = isToday ? 'Eaten today' : 'Eaten';
  const goalLabel = isToday ? 'Goal' : 'Current goal';

  return (
    <div className="flex flex-col gap-5 lg:gap-4">
      {/* Outside the gate, so stepping the day is still possible while the day
          it stepped to is loading or has failed. */}
      <div className="flex justify-center">
        <DayNav />
      </div>

      {gate.state === 'error' ? (
        <DashboardError onRetry={gate.retryAll} />
      ) : gate.state === 'loading' ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Twice the widget's width at `lg`: this card carries three numbers
              and the widget carries one. */}
          <div className="flex flex-col gap-5 lg:flex-row lg:gap-3.5">
            <Card className="gap-2.5 p-5 lg:grow-2 lg:basis-0">
              {/* Three figures, three names — see `spokenStat`. */}
              <span className="sr-only">
                {spokenStat(remainingLabel, remainingKcal, ' kcal')}
              </span>
              <span className="sr-only">
                {spokenStat(eatenLabel, eatenKcal)}
              </span>
              <span className="sr-only">{spokenStat(goalLabel, goalKcal)}</span>

              <span
                aria-hidden="true"
                className="text-sm text-muted-foreground"
              >
                {remainingLabel}
              </span>
              <div
                aria-hidden="true"
                className="font-heading text-4xl font-semibold tabular-nums"
              >
                <NumberFlow value={remainingKcal} suffix=" kcal" />
              </div>
              <Progress value={progressPct} />
              <div aria-hidden="true" className="flex justify-between">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
                  <Image
                    src={fullnessMascot(eatenKcal, goalKcal)}
                    alt=""
                    width={20}
                    height={20}
                  />
                  <NumberFlow value={eatenKcal} /> eaten
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {goalLabel} <NumberFlow value={goalKcal} />
                </span>
              </div>
            </Card>

            <StatWidget
              // Centred at `lg` only: stretched to the hero's height, a label
              // and a date pinned to the top read as a card that failed to
              // finish loading.
              className="lg:grow lg:basis-0 lg:justify-center"
              {...goalStat(gate.goal)}
            />
          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:gap-3.5">
            <section className="flex flex-col gap-2.5 lg:grow lg:basis-0">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-semibold">Weight trend</h2>
                {/* The change belongs beside the chart that explains it, not
                    three blocks away as a widget of its own. */}
                {weightReady && (
                  <div className="flex items-center gap-2">
                    <span className="sr-only">
                      {spokenStat('Weight change', weightChangeKg, ' kg')}
                    </span>
                    <span
                      aria-hidden="true"
                      className="text-sm text-success-text tabular-nums"
                    >
                      <NumberFlow
                        value={weightChangeKg}
                        suffix=" kg this month"
                      />
                    </span>
                    <WeightHistoryDrawer
                      entries={weightEntries}
                      onWeightsChanged={onWeightsChanged}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="touch-target"
                        >
                          <History />
                        </Button>
                      }
                    />
                  </div>
                )}
              </div>
              <Card className="h-40 p-4 lg:h-64 lg:p-5">
                {weightReady ? (
                  <WeightTrendChart
                    className="aspect-auto min-h-0 w-full grow basis-0"
                    data={weightTrend}
                  />
                ) : weightStatus === 'error' ? (
                  <InlineError onRetry={retryWeight} />
                ) : (
                  <Skeleton className="min-h-0 w-full grow basis-0" />
                )}
              </Card>
            </section>

            {/* One height per step across the band: two charts side by side
                that disagree on height read as a mistake. */}
            <section className="flex flex-col gap-2.5 lg:grow lg:basis-0">
              <h2 className="text-base font-semibold">
                Daily calories (7 days)
              </h2>
              <Card className="h-40 p-4 lg:h-64 lg:p-5">
                <DailyCaloriesChart
                  className="aspect-auto min-h-0 w-full grow basis-0"
                  data={dailyCalories}
                />
              </Card>
            </section>
          </div>

          <section className="flex flex-col gap-2.5">
            <h2 className="text-sm font-semibold lg:text-base">
              {isToday ? 'Logged today' : 'Logged meals'}
            </h2>
            {selectedDayMeals.length === 0 ? (
              <EmptyMeals />
            ) : (
              <MealGroupsAccordion meals={selectedDayMeals} />
            )}
          </section>

          {/* A footnote, so it is last at every width. */}
          <Disclaimer />
        </>
      )}
    </div>
  );
}
