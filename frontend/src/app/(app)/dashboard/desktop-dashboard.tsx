'use client';

import {
  DailyCaloriesChart,
  RemainingTodayRingCard,
  WeightTrendCard,
} from '@/components/dashboard-charts';
import { Disclaimer } from '@/components/disclaimer';
import { MealGroupsAccordion } from '@/components/meal-groups-accordion';
import { MealLogDrawer } from '@/components/meal-log-drawer';
import { Card } from '@/components/ui/card';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatGoalDate, weeksUntil } from '@/lib/dashboard-transforms';
import { useMeals } from '@/lib/meals-context';
import { useWeight } from '@/lib/weight-context';
import { EmptyMeals } from './empty-meals';
import { DayNav } from './day-nav';
import { CARD_CLASS, fullnessMascot } from './helpers';
import { StatWidget } from './stat-widget';
import {
  DashboardError,
  DesktopDashboardSkeleton,
  InlineError,
  TileSkeleton,
} from './states';
import { useDashboardGate } from './use-dashboard-gate';
import { WeightHistoryDrawer } from './weight-history-drawer';

const WEIGHT_TREND_CARD_CLASS = `${CARD_CLASS} grow-2 basis-0 gap-3 px-6 py-5.5`;

export function DesktopDashboard() {
  const {
    eatenKcal,
    remainingKcal,
    goalKcal,
    todayMeals,
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
    <div className="hidden flex-col gap-5.5 overflow-clip bg-bg px-10 py-8 lg:flex lg:h-screen">
      <div className="relative flex items-center gap-2">
        <SidebarTrigger className="text-text-muted" />
        <h1 className="font-display text-heading-lg font-semibold text-text">
          Dashboard
        </h1>
        <div className="absolute left-1/2 -translate-x-1/2">
          <DayNav />
        </div>
      </div>

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

          <div className="flex min-h-0 grow basis-0 gap-3.5">
            <div className="flex min-h-0 grow-2 basis-0 flex-col gap-3.5">
              {weightStatus === 'ready' ? (
                <WeightTrendCard
                  className={WEIGHT_TREND_CARD_CLASS}
                  chartClassName="aspect-auto min-h-0 w-full grow basis-0"
                  title="Weight trend"
                  action={
                    <WeightHistoryDrawer
                      entries={weightEntries}
                      onWeightsChanged={onWeightsChanged}
                      triggerClassName="flex size-6 items-center justify-center rounded-sm text-text-muted hover:bg-[#F0EEE9]"
                    />
                  }
                  data={weightTrend}
                />
              ) : (
                <Card className={WEIGHT_TREND_CARD_CLASS}>
                  <div className="font-sans text-label font-semibold text-text">
                    Weight trend
                  </div>
                  {weightStatus === 'error' ? (
                    <InlineError onRetry={retryWeight} />
                  ) : (
                    <Skeleton className="min-h-0 w-full grow basis-0" />
                  )}
                </Card>
              )}

              <div className="flex min-h-0 grow basis-0 flex-col gap-2.5">
                <h2 className="font-sans text-caption font-semibold text-text">
                  {isToday ? 'Logged today' : 'Logged meals'}
                </h2>
                <div className="flex min-h-0 grow basis-0 flex-col gap-2.5 overflow-y-auto">
                  {todayMeals.length === 0 ? (
                    <EmptyMeals />
                  ) : (
                    <MealGroupsAccordion meals={todayMeals} />
                  )}
                  <MealLogDrawer triggerClassName="ml-auto h-10 text-label font-semibold" />
                </div>
              </div>
            </div>

            <div className="flex min-h-0 grow basis-0 flex-col gap-3.5">
              <RemainingTodayRingCard
                className={`${CARD_CLASS} shrink-0 items-center gap-2 p-5`}
                remainingKcal={remainingKcal}
                goalKcal={goalKcal}
              />
              <Card className={`${CARD_CLASS} grow basis-0 gap-2.5 p-5`}>
                <h2 className="font-sans text-caption font-semibold text-text">
                  7-day calories
                </h2>
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
