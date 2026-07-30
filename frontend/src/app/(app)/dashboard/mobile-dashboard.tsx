'use client';

import { useAuth } from '@/components/auth-provider';
import { Disclaimer } from '@/components/disclaimer';
import { MealGroupsAccordion } from '@/components/meal-groups-accordion';
import { MealLogDrawer } from '@/components/meal-log-drawer';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DailyCaloriesChart, WeightTrendChart } from '@/components/ui/charts';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { WeightDrawer } from '@/components/weight-drawer';
import { formatGoalDate, weeksUntil } from '@/lib/dashboard-transforms';
import { useMeals } from '@/lib/meals-context';
import { initialsOf } from '@/lib/user-display';
import { useWeight } from '@/lib/weight-context';
import NumberFlow from '@number-flow/react';
import { History } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { EmptyMeals } from './empty-meals';
import { fullnessMascot } from './helpers';
import { StatWidget } from './stat-widget';
import { DashboardError, InlineError, MobileDashboardSkeleton } from './states';
import { useDashboardGate } from './use-dashboard-gate';
import { WeightHistoryDrawer } from './weight-history-drawer';

export function MobileDashboard() {
  const { user } = useAuth();
  const {
    eatenKcal,
    remainingKcal,
    progressPct,
    goalKcal,
    todayMeals,
    dailyCalories,
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
      <div className="flex items-center justify-between">
        <Text variant="heading" render={<h1 />}>
          Today
        </Text>
        {/* The sidebar (and its profile menu) is desktop-only — on mobile the
            avatar is the only path to the profile page. */}
        <Link href="/profile" aria-label="Open profile">
          <Avatar>
            <AvatarFallback>{initialsOf(user)}</AvatarFallback>
          </Avatar>
        </Link>
      </div>

      {gate.state === 'error' ? (
        <DashboardError onRetry={gate.retryAll} />
      ) : gate.state === 'loading' ? (
        <MobileDashboardSkeleton />
      ) : (
        <>
          <Card variant="panel" className="gap-2.5 p-5">
            <Text variant="caption" tone="muted" render={<h2 />}>
              Remaining today
            </Text>
            <Text variant="display" numeric>
              <NumberFlow value={remainingKcal} suffix=" kcal" />
            </Text>
            <Progress value={progressPct} />
            <div className="flex justify-between">
              <Text
                variant="caption"
                tone="muted"
                numeric
                className="flex items-center gap-1.5"
              >
                <Image
                  src={fullnessMascot(eatenKcal, goalKcal)}
                  alt=""
                  width={20}
                  height={20}
                />
                <NumberFlow value={eatenKcal} /> eaten
              </Text>
              <Text variant="caption" tone="muted" numeric>
                Goal <NumberFlow value={goalKcal} />
              </Text>
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
              <Text variant="label" render={<h2 />}>
                Weight trend
              </Text>
              <div className="flex items-center gap-2">
                {weightReady && (
                  <Text variant="caption" tone="success" numeric>
                    <NumberFlow
                      value={weightChangeKg}
                      suffix=" kg this month"
                    />
                  </Text>
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
            <Card variant="panel" className="p-4">
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
            <Text variant="label" render={<h2 />}>
              Daily calories (7 days)
            </Text>
            <Card variant="panel" className="shrink-0 px-4 pt-4 pb-3">
              <DailyCaloriesChart
                className="aspect-auto h-30 w-full flex-none"
                data={dailyCalories}
              />
            </Card>
          </div>

          <Disclaimer />

          <div className="flex flex-col gap-2.5">
            <Text variant="label" render={<h2 />}>
              Logged today
            </Text>
            {todayMeals.length === 0 ? (
              <EmptyMeals />
            ) : (
              <MealGroupsAccordion meals={todayMeals} />
            )}
          </div>

          <Separator />
          <div className="flex gap-2.5">
            <MealLogDrawer>Log a meal</MealLogDrawer>
            <WeightDrawer
              mode="create"
              onWeightSaved={onWeightSaved}
              trigger={
                <Button variant="outline" size="lg" className="grow basis-0" />
              }
            >
              Log weight
            </WeightDrawer>
          </div>
        </>
      )}
    </div>
  );
}
