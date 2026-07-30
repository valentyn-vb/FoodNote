'use client';

import { History } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Disclaimer } from '@/components/disclaimer';
import {
  DailyCaloriesChart,
  RemainingTodayRing,
  WeightTrendChart,
} from '@/components/ui/charts';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useMeals } from '@/lib/meals-context';
import { useWeight } from '@/lib/weight-context';
import { formatGoalDate, weeksUntil } from '@/lib/dashboard-transforms';
import { fullnessMascot } from './helpers';
import { StatWidget } from './stat-widget';
import { EmptyMeals } from './empty-meals';
import { MealRow } from './meal-row';
import { WeightHistoryDrawer } from './weight-history-drawer';
import {
  DashboardError,
  DesktopDashboardSkeleton,
  InlineError,
  TileSkeleton,
} from './states';
import { useDashboardGate } from './use-dashboard-gate';

export function DesktopDashboard() {
  const { eatenKcal, remainingKcal, goalKcal, todayMeals, dailyCalories } =
    useMeals();
  const {
    status: weightStatus,
    retry: retryWeight,
    entries: weightEntries,
    weightTrend,
    weightChangeKg,
    weightChangeLastMonthKg,
    onWeightsChanged,
  } = useWeight();

  const gate = useDashboardGate();
  // "Yesterday" is the second-to-last entry of the 7-day series (last = today).
  const eatenYesterday = dailyCalories.at(-2)?.kcal ?? 0;
  const remainingYesterday = Math.max(0, goalKcal - eatenYesterday);

  return (
    // Grows with its content and lets the page scroll. Pinned to `h-screen`
    // with `overflow-clip` it could not: the meal list is the only part that
    // grows, so every row shrank to keep the layout inside one viewport.
    <div className="hidden flex-col gap-5.5 px-10 py-8 lg:flex lg:min-h-screen">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <Text variant="heading" render={<h1 />}>
          Dashboard
        </Text>
      </div>

      {gate.state === 'error' ? (
        <DashboardError onRetry={gate.retryAll} />
      ) : gate.state === 'loading' ? (
        <DesktopDashboardSkeleton />
      ) : (
        <>
          <div className="flex gap-3.5 *:grow *:basis-0">
            <StatWidget
              label="Remaining today"
              value={remainingKcal}
              suffix=" kcal"
            />
            <StatWidget
              label="Eaten today"
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
              <Card variant="panel" className="h-96 gap-3 px-6 py-5.5">
                <div className="flex items-center justify-between">
                  <Text variant="label">Weight trend</Text>
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
                <Text variant="label" render={<h2 />}>
                  Logged today
                </Text>
                <div className="flex flex-col gap-2.5">
                  {todayMeals.length === 0 && <EmptyMeals />}
                  {todayMeals.map((meal) => (
                    <MealRow key={meal.id} meal={meal} />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex grow basis-0 flex-col gap-3.5">
              <Card variant="panel" className="shrink-0 items-center gap-2 p-5">
                <Text variant="label" className="self-start" render={<h2 />}>
                  Remaining today
                </Text>
                <RemainingTodayRing
                  remainingKcal={remainingKcal}
                  goalKcal={goalKcal}
                />
              </Card>
              <Card variant="panel" className="h-72 gap-2.5 p-5">
                <Text variant="label" render={<h2 />}>
                  7-day calories
                </Text>
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
