'use client';

import { Disclaimer } from '@/components/disclaimer';
import { MealGroupsAccordion } from '@/components/meal-groups-accordion';
import { MealLogDrawer } from '@/components/meal-log-drawer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DailyCaloriesChart, WeightTrendChart } from '@/components/charts';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { WeightLogDrawer } from '@/components/weight-log-drawer';
import { formatGoalDate, weeksUntil } from '@/lib/dashboard-transforms';
import { useMeals } from '@/lib/meals-context';
import { useWeight } from '@/lib/weight-context';
import NumberFlow from '@number-flow/react';
import { History } from 'lucide-react';
import Image from 'next/image';
import { EmptyMeals } from './empty-meals';
import { fullnessMascot } from './helpers';
import { StatWidget } from './stat-widget';
import { DashboardError, InlineError, MobileDashboardSkeleton } from './states';
import { useDashboardGate } from './use-dashboard-gate';
import { WeightHistoryDrawer } from './weight-history-drawer';

export function MobileDashboard() {
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
    onWeightSaved,
    onWeightsChanged,
  } = useWeight();

  const gate = useDashboardGate();
  const weightReady = weightStatus === 'ready';

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-8 lg:hidden">
      {gate.state === 'error' ? (
        <DashboardError onRetry={gate.retryAll} />
      ) : gate.state === 'loading' ? (
        <MobileDashboardSkeleton />
      ) : (
        <>
          <Card className="gap-2.5 p-5">
            <h2 className="text-sm text-muted-foreground">
              {isToday ? 'Remaining today' : 'Remaining'}
            </h2>
            <div className="font-heading text-4xl font-semibold tabular-nums">
              <NumberFlow value={remainingKcal} suffix=" kcal" />
            </div>
            <Progress value={progressPct} />
            <div className="flex justify-between">
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
                {isToday ? 'Goal' : 'Current goal'}{' '}
                <NumberFlow value={goalKcal} />
              </span>
            </div>
          </Card>

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

          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-semibold">Weight trend</h2>
              <div className="flex items-center gap-2">
                {weightReady && (
                  <span className="text-sm text-success-text tabular-nums">
                    <NumberFlow
                      value={weightChangeKg}
                      suffix=" kg this month"
                    />
                  </span>
                )}
                {weightReady && (
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
            </div>
            <Card className="p-4">
              {weightReady ? (
                <WeightTrendChart
                  className="aspect-auto h-[110px] w-full flex-none"
                  data={weightTrend}
                />
              ) : weightStatus === 'error' ? (
                <InlineError onRetry={retryWeight} />
              ) : (
                <Skeleton className="h-27.5 w-full" />
              )}
            </Card>
          </div>

          <div className="flex flex-col gap-2.5">
            <h2 className="text-base font-semibold">Daily calories (7 days)</h2>
            <Card className="shrink-0 px-4 pt-4 pb-3">
              <DailyCaloriesChart
                className="aspect-auto h-30 w-full flex-none"
                data={dailyCalories}
              />
            </Card>
          </div>

          <Disclaimer />

          <div className="flex flex-col gap-2.5">
            <h2 className="text-sm font-semibold">
              {isToday ? 'Logged today' : 'Logged meals'}
            </h2>
            {selectedDayMeals.length === 0 ? (
              <EmptyMeals />
            ) : (
              <MealGroupsAccordion meals={selectedDayMeals} />
            )}
          </div>

          {/* Nothing to log into a day that has passed. */}
          {isToday && (
            <>
              <Separator />
              <div className="flex gap-2.5">
                {/* Twice the weight button's share of the bar — it is the action
                    this screen exists for. */}
                <MealLogDrawer
                  trigger={
                    <Button size="lg" className="grow-2 basis-0 px-8">
                      Log a meal
                    </Button>
                  }
                />
                <WeightLogDrawer
                  mode="create"
                  onWeightSaved={onWeightSaved}
                  trigger={
                    <Button
                      variant="outline"
                      size="lg"
                      className="grow basis-0"
                    >
                      Log weight
                    </Button>
                  }
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
