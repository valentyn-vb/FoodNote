'use client';

import { History } from 'lucide-react';
import { Disclaimer } from '@/components/disclaimer';
import { MealGroupsAccordion } from '@/components/meal-groups-accordion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DailyCaloriesChart,
  RemainingTodayRing,
  WeightTrendChart,
} from '@/components/charts';
import { Skeleton } from '@/components/ui/skeleton';
import { formatGoalDate, weeksUntil } from '@/lib/dashboard-transforms';
import { useMeals } from '@/lib/meals-context';
import { useWeight } from '@/lib/weight-context';
import { EmptyMeals } from './empty-meals';
import { fullnessMascot } from './helpers';
import { StatWidget } from './stat-widget';
import {
  DashboardError,
  DesktopDashboardSkeleton,
  InlineError,
  TileSkeleton,
} from './states';
import { useDashboardGate } from './use-dashboard-gate';
import { WeightHistoryDrawer } from './weight-history-drawer';

export function DesktopDashboard() {
  const {
    eatenKcal,
    remainingKcal,
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

  return (
    // Grows with its content and lets the page scroll. Pinned to `h-screen`
    // with `overflow-clip` it could not: the meal list is the only part that
    // grows, so every row shrank to keep the layout inside one viewport.
    <div className="hidden flex-col gap-4 lg:flex lg:min-h-screen">
      {gate.state === 'error' ? (
        <DashboardError onRetry={gate.retryAll} />
      ) : gate.state === 'loading' ? (
        <DesktopDashboardSkeleton />
      ) : (
        <>
          <div className="flex gap-3.5 *:grow *:basis-0">
            <StatWidget
              label={isToday ? 'Remaining today' : 'Remaining'}
              value={remainingKcal}
              suffix=" kcal"
            />
            <StatWidget
              label={isToday ? 'Eaten today' : 'Eaten'}
              value={eatenKcal}
              suffix=" kcal"
              mascotSrc={fullnessMascot(eatenKcal, goalKcal)}
            />
            {weightStatus === 'ready' ? (
              <StatWidget
                label="Weight change"
                value={weightChangeKg}
                suffix=" kg"
              />
            ) : (
              <TileSkeleton />
            )}
            <StatWidget
              label={
                gate.goal.reachedTarget
                  ? 'Goal'
                  : gate.goal.projectedGoalDate === null
                    ? 'Goal'
                    : 'Projected goal date'
              }
              value={
                gate.goal.reachedTarget
                  ? 'You hit your target'
                  : !gate.goal.projectedGoalDate
                    ? 'Maintaining your weight'
                    : `${formatGoalDate(gate.goal.projectedGoalDate)} · ${weeksUntil(
                        gate.goal.projectedGoalDate,
                        new Date(),
                      )} wks`
              }
            />
          </div>

          {/* `items-start`, so a long meal list grows the page instead of
              stretching the charts beside it. */}
          <div className="flex items-start gap-3.5">
            <div className="flex grow-2 basis-0 flex-col gap-3.5">
              <Card className="h-96 gap-3 px-6 py-5.5">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold">Weight trend</span>
                  {weightStatus === 'ready' && (
                    <WeightHistoryDrawer
                      entries={weightEntries}
                      onWeightsChanged={onWeightsChanged}
                      trigger={
                        <Button variant="ghost" size="icon-sm">
                          <History />
                        </Button>
                      }
                    />
                  )}
                </div>
                {weightStatus === 'ready' ? (
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

              <div className="flex flex-col gap-2.5">
                <h2 className="text-base font-semibold">
                  {isToday ? 'Logged today' : 'Logged meals'}
                </h2>
                <div className="flex flex-col gap-2.5">
                  {selectedDayMeals.length === 0 ? (
                    <EmptyMeals />
                  ) : (
                    <MealGroupsAccordion meals={selectedDayMeals} />
                  )}
                </div>
              </div>
            </div>

            <div className="flex grow basis-0 flex-col gap-3.5">
              <Card className="shrink-0 items-center gap-2 p-5">
                <h2 className="self-start text-base font-semibold">
                  Remaining today
                </h2>
                <RemainingTodayRing
                  remainingKcal={remainingKcal}
                  goalKcal={goalKcal}
                />
              </Card>
              <Card className="h-72 gap-2.5 p-5">
                <h2 className="text-base font-semibold">7-day calories</h2>
                <DailyCaloriesChart
                  className="aspect-auto min-h-0 w-full grow basis-0"
                  data={dailyCalories}
                />
              </Card>
            </div>
          </div>

          <Disclaimer />
        </>
      )}
    </div>
  );
}
