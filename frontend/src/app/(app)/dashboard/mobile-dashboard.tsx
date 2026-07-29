'use client';

import { useAuth } from '@/components/auth-provider';
import {
  DailyCaloriesChart,
  WeightTrendCard,
} from '@/components/dashboard-charts';
import { Disclaimer } from '@/components/disclaimer';
import { MealLogDrawer } from '@/components/meal-log-drawer';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { WeightLogDrawer } from '@/components/weight-log-drawer';
import { formatGoalDate, weeksUntil } from '@/lib/dashboard-transforms';
import { useMeals } from '@/lib/meals-context';
import { initialsOf } from '@/lib/user-display';
import { useWeight } from '@/lib/weight-context';
import NumberFlow from '@number-flow/react';
import Image from 'next/image';
import Link from 'next/link';
import { EmptyMeals } from './empty-meals';
import { fullnessMascot } from './helpers';
import { MealRow } from './meal-row';
import { StatWidget } from './stat-widget';
import { DashboardError, InlineError, MobileDashboardSkeleton } from './states';
import { useDashboardGate } from './use-dashboard-gate';

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
    weightTrend,
    weightChangeKg,
    onWeightSaved,
  } = useWeight();

  const gate = useDashboardGate();
  const weightReady = weightStatus === 'ready';

  return (
    <div className="flex flex-col gap-5 bg-bg px-5 pt-6 pb-8 lg:hidden">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-heading-lg font-semibold text-text">
          Today
        </h1>
        {/* The sidebar (and its profile menu) is desktop-only — on mobile the
            avatar is the only path to the profile page. */}
        <Link href="/profile" aria-label="Open profile">
          <Avatar>
            <AvatarFallback className="bg-primary text-surface">
              {initialsOf(user)}
            </AvatarFallback>
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
            <h2 className="font-sans text-caption text-text-muted">
              Remaining today
            </h2>
            <NumberFlow
              value={remainingKcal}
              suffix=" kcal"
              className="font-display text-[38px] font-semibold text-text"
            />
            <div className="h-2 shrink-0 overflow-hidden rounded-full bg-track">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between font-sans text-[12.5px] text-text-muted [font-variant-numeric:tabular-nums]">
              <div className="flex items-center gap-1.5">
                <Image
                  src={fullnessMascot(eatenKcal, goalKcal)}
                  alt=""
                  width={20}
                  height={20}
                />
                <NumberFlow value={eatenKcal} /> eaten
              </div>
              <div>
                Goal <NumberFlow value={goalKcal} />
              </div>
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
              <h2 className="font-sans text-caption font-medium text-text">
                Weight trend
              </h2>
              {weightReady && (
                <div className="font-sans text-[12px] font-medium text-secondary-deep">
                  <NumberFlow value={weightChangeKg} suffix=" kg this month" />
                </div>
              )}
            </div>
            {weightReady ? (
              <WeightTrendCard
                className="p-4"
                chartClassName="aspect-auto h-[110px] w-full flex-none"
                data={weightTrend}
              />
            ) : (
              <Card variant="panel" className="p-4">
                {weightStatus === 'error' ? (
                  <InlineError onRetry={retryWeight} />
                ) : (
                  <Skeleton className="h-27.5 w-full" />
                )}
              </Card>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            <h2 className="font-sans text-caption font-medium text-text">
              Daily calories (7 days)
            </h2>
            <Card variant="panel" className="shrink-0 px-4 pt-4 pb-3">
              <DailyCaloriesChart
                className="aspect-auto h-30 w-full flex-none"
                data={dailyCalories}
              />
            </Card>
          </div>

          <Disclaimer />

          <div className="flex flex-col gap-2.5">
            <h2 className="font-sans text-caption font-medium text-text">
              Logged today
            </h2>
            {todayMeals.length === 0 && <EmptyMeals />}
            {todayMeals.map((meal) => (
              <MealRow key={meal.id} meal={meal} />
            ))}
          </div>

          <div className="flex gap-2.5 border-t border-border pt-3">
            <MealLogDrawer>Log a meal</MealLogDrawer>
            <WeightLogDrawer
              onWeightSaved={onWeightSaved}
              triggerClassName="h-12.5 grow basis-0 rounded-sm border border-border text-[13.5px] font-medium text-text"
            >
              Log weight
            </WeightLogDrawer>
          </div>
        </>
      )}
    </div>
  );
}
