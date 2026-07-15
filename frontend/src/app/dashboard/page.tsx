'use client';

import { useState } from 'react';
import NumberFlow from '@number-flow/react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MealLogDrawer } from '@/components/meal-log-drawer';
import { AppSidebar } from '@/components/app-sidebar';
import {
  DailyCaloriesChart,
  RemainingTodayRingCard,
  WeightTrendCard,
} from '@/components/dashboard-charts';
import {
  mockDashboardStats,
  mockRecentMeals,
  mockUserProfile,
  type Meal,
} from '@/lib/mock-data';

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('');
}

const CARD_CLASS =
  'rounded-lg border border-border bg-surface shadow-[0_1px_3px_#0000000a] ring-0 py-0';
const STAT_TILE_CLASS =
  'grow basis-0 gap-1.5 rounded-md border border-border bg-surface px-4.5 py-4 shadow-[0_1px_2px_#00000008] ring-0';

export default function DashboardPage() {
  const stats = mockDashboardStats;
  // Meals live in state so a save from the Drawer visibly moves the numbers —
  // NumberFlow animates them, per the H03 implementation annotation.
  const [meals, setMeals] = useState<Meal[]>(mockRecentMeals);
  const initials = initialsOf(mockUserProfile.name);
  const eatenKcal = meals.reduce((sum, meal) => sum + meal.kcal, 0);
  const remainingKcal = Math.max(0, stats.goalKcal - eatenKcal);
  const progressPct = Math.min(
    100,
    Math.round((eatenKcal / stats.goalKcal) * 100),
  );

  function handleMealSaved(kcal: number) {
    setMeals((prev) => [
      ...prev,
      {
        id: `m${prev.length + 1}`,
        name: 'Chicken with rice, salad and latte',
        kcal,
        source: 'ai',
        loggedAt: 'Just now',
      },
    ]);
  }

  function handleMealUndone() {
    // Only pop meals added this session — never the seeded mock entries.
    setMeals((prev) =>
      prev.length > mockRecentMeals.length ? prev.slice(0, -1) : prev,
    );
  }

  return (
    <>
      {/* Mobile — up to the lg breakpoint. Desktop reuses this same route,
          not a separate page, per docs/design/foodnote-design-summary.md. */}
      <div className="flex flex-col gap-5 bg-bg px-5 pt-6 pb-8 lg:hidden">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-heading-lg font-semibold text-text">
            Today
          </h1>
          <Avatar>
            <AvatarFallback className="bg-primary text-surface">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        <Card className={`${CARD_CLASS} gap-2.5 p-5`}>
          <div className="font-sans text-caption text-text-muted">
            Remaining today
          </div>
          <NumberFlow
            value={remainingKcal}
            suffix=" kcal"
            className="font-display text-[38px] font-semibold text-text"
          />
          <div className="h-2 shrink-0 overflow-hidden rounded-full bg-[#F0EEE9]">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between font-sans text-[12.5px] text-text-muted [font-variant-numeric:tabular-nums]">
            <div>
              <NumberFlow value={eatenKcal} /> eaten
            </div>
            <div>Goal {stats.goalKcal.toLocaleString()}</div>
          </div>
        </Card>

        <div className="flex items-center gap-2 rounded-sm bg-[#FFF3E7] px-4 py-3">
          <div className="font-sans text-caption font-medium text-primary-deep">
            Projected goal date: {stats.goalDate} · {stats.weeksLeft} weeks left
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <div className="font-sans text-caption font-medium text-text">
              Weight trend
            </div>
            <div className="font-sans text-[12px] font-medium text-secondary-deep">
              {stats.weightTrendKg} kg this month
            </div>
          </div>
          <WeightTrendCard
            className={`${CARD_CLASS} p-4`}
            chartClassName="aspect-auto h-[110px] w-full flex-none"
          />
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="font-sans text-caption font-medium text-text">
            Daily calories (7 days)
          </div>
          <Card className={`${CARD_CLASS} shrink-0 px-4 pt-4 pb-3`}>
            <DailyCaloriesChart className="aspect-auto h-[120px] w-full flex-none" />
          </Card>
        </div>

        <div className="font-sans text-[11.5px] text-text-muted">
          This is an estimate, not medical advice. Actual results vary.
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="font-sans text-caption font-medium text-text">
            Logged today
          </div>
          {meals.map((meal) => (
            <Card
              key={meal.id}
              className={`${CARD_CLASS} flex-row items-center justify-between px-4 py-3.5`}
            >
              <div className="flex flex-col gap-0.5">
                <div className="font-sans text-label font-semibold text-text">
                  {meal.name}
                </div>
                <div className="font-sans text-[12px] text-text-muted">
                  {meal.source === 'ai' ? 'AI logged' : 'Manual'} ·{' '}
                  {meal.loggedAt}
                </div>
              </div>
              <div className="font-sans text-label font-semibold text-text [font-variant-numeric:tabular-nums]">
                {meal.kcal} kcal
              </div>
            </Card>
          ))}
        </div>

        <div className="flex gap-2.5 border-t border-border pt-3">
          <MealLogDrawer
            onMealSaved={handleMealSaved}
            onMealUndone={handleMealUndone}
          />
          <Button
            variant="outline"
            className="h-12.5 grow basis-0 rounded-sm border-border text-[13.5px] font-medium"
          >
            Log weight
          </Button>
        </div>
      </div>

      {/* Desktop — lg and up: sidebar + multi-column layout, same route/data. */}
      <div className="hidden bg-bg lg:flex lg:h-screen">
        <AppSidebar active="Dashboard" />

        <div className="flex grow basis-0 flex-col gap-5.5 overflow-clip px-10 py-8">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-heading-lg font-semibold text-text">
              Dashboard
            </h1>
            <Avatar>
              <AvatarFallback className="bg-primary text-surface">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex gap-3.5">
            <Card className={STAT_TILE_CLASS}>
              <div className="font-sans text-[12px] text-text-muted">
                Remaining today
              </div>
              <NumberFlow
                value={remainingKcal}
                suffix=" kcal"
                className="font-display text-heading-lg font-semibold text-text"
              />
            </Card>
            <Card className={STAT_TILE_CLASS}>
              <div className="font-sans text-[12px] text-text-muted">
                Eaten today
              </div>
              <NumberFlow
                value={eatenKcal}
                suffix=" kcal"
                className="font-display text-heading-lg font-semibold text-text"
              />
            </Card>
            <Card className={STAT_TILE_CLASS}>
              <div className="font-sans text-[12px] text-text-muted">
                Weight change
              </div>
              <div className="font-display text-heading-lg font-semibold text-text-muted">
                {stats.weightTrendKg} kg this month
              </div>
            </Card>
            <Card className={STAT_TILE_CLASS}>
              <div className="font-sans text-[12px] text-text-muted">
                Projected goal date
              </div>
              <div className="font-display text-heading-lg font-semibold text-text">
                {stats.goalDate} · {stats.weeksLeft} wks
              </div>
            </Card>
          </div>

          <div className="flex min-h-0 grow basis-0 gap-3.5">
            <WeightTrendCard
              className={`${CARD_CLASS} grow-2 basis-0 gap-3 px-6 py-5.5`}
              chartClassName="aspect-auto min-h-0 w-full grow basis-0"
              title="Weight trend"
            />

            <div className="flex min-h-0 grow basis-0 flex-col gap-3.5">
              <RemainingTodayRingCard
                className={`${CARD_CLASS} grow basis-0 items-center justify-center gap-2 p-5`}
                remainingKcal={remainingKcal}
                goalKcal={stats.goalKcal}
              />
              <Card className={`${CARD_CLASS} grow basis-0 gap-2.5 p-5`}>
                <div className="font-sans text-caption font-semibold text-text">
                  7-day calories
                </div>
                <DailyCaloriesChart className="aspect-auto min-h-0 w-full grow basis-0" />
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
