'use client';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Disclaimer } from '@/components/disclaimer';
import {
  DailyCaloriesChart,
  RemainingTodayRingCard,
  WeightTrendCard,
} from '@/components/dashboard-charts';
import { useMeals } from '@/lib/meals-context';
import { useWeight } from '@/lib/weight-context';
import { formatGoalDate, weeksUntil } from '@/lib/dashboard-transforms';
import { CARD_CLASS, fullnessMascot } from './helpers';
import { StatWidget } from './stat-widget';
import { EmptyMeals } from './empty-meals';
import { MealRow } from './meal-row';
import { WeightHistoryDrawer } from './weight-history-drawer';
import {
  DashboardError,
  DesktopDashboardSkeleton,
  InlineError,
} from './states';
import { useDashboardGate } from './use-dashboard-gate';

const WEIGHT_TREND_CARD_CLASS = `${CARD_CLASS} grow-2 basis-0 gap-3 px-6 py-5.5`;

export function DesktopDashboard() {
  const { eatenKcal, remainingKcal, goalKcal, todayMeals, dailyCalories } =
    useMeals();
  const {
    status: weightStatus,
    retry: retryWeight,
    entries: weightEntries,
    weightTrend,
    onWeightsChanged,
  } = useWeight();

  const gate = useDashboardGate();
  // "Yesterday" is the second-to-last entry of the 7-day series (last = today).
  const eatenYesterday = dailyCalories.at(-2)?.kcal ?? 0;
  const remainingYesterday = Math.max(0, goalKcal - eatenYesterday);

  return (
    <div className="hidden flex-col gap-5.5 overflow-clip bg-bg px-10 py-8 lg:flex lg:h-screen">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="text-text-muted" />
        <h1 className="font-display text-heading-lg font-semibold text-text">
          Dashboard
        </h1>
      </div>

      {gate.state === 'error' ? (
        <DashboardError onRetry={gate.retryAll} />
      ) : gate.state === 'loading' ? (
        <DesktopDashboardSkeleton />
      ) : (
        <>
          <div className="flex gap-3.5 [&>*]:grow [&>*]:basis-0">
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
                  Logged today
                </h2>
                <div className="flex min-h-0 grow basis-0 flex-col gap-2.5 overflow-y-auto">
                  {todayMeals.length === 0 && <EmptyMeals />}
                  {todayMeals.map((meal) => (
                    <MealRow key={meal.id} meal={meal} />
                  ))}
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
