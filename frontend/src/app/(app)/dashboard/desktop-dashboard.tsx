'use client';

import { Card } from '@/components/ui/card';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Disclaimer } from '@/components/disclaimer';
import {
  DailyCaloriesChart,
  RemainingTodayRingCard,
  WeightTrendCard,
} from '@/components/dashboard-charts';
import { mockDailyCalories, mockDashboardStats } from '@/lib/mock-data';
import { useMeals } from '@/lib/meals-context';
import { useWeight } from '@/lib/weight-context';
import { CARD_CLASS, STAT_TILE_CLASS, fullnessMascot } from './helpers';
import { CompareStat } from './compare-stat';
import { EmptyMeals } from './empty-meals';
import { MealRow } from './meal-row';

export function DesktopDashboard() {
  const stats = mockDashboardStats;
  const { meals, eatenKcal, remainingKcal, goalKcal } = useMeals();
  const { weightTrend, weightChangeKg } = useWeight();
  // "Yesterday" is the second-to-last entry of the 7-day series (last = today).
  const eatenYesterday = mockDailyCalories.at(-2)!.kcal;
  const remainingYesterday = Math.max(0, goalKcal - eatenYesterday);

  return (
    <div className="hidden flex-col gap-5.5 overflow-clip bg-bg px-10 py-8 lg:flex lg:h-screen">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="text-text-muted" />
        <h1 className="font-display text-heading-lg font-semibold text-text">
          Dashboard
        </h1>
      </div>

      <div className="flex gap-3.5">
        <CompareStat
          label="Remaining today"
          value={remainingKcal}
          compareLabel="Remaining yesterday"
          compareValue={remainingYesterday}
          suffix=" kcal"
          goodIsDown={false}
        />
        <CompareStat
          label="Eaten today"
          value={eatenKcal}
          compareLabel="Eaten yesterday"
          compareValue={eatenYesterday}
          suffix=" kcal"
          goodIsDown
          mascotSrc={fullnessMascot(eatenKcal, goalKcal)}
        />
        <CompareStat
          label="Weight change"
          value={weightChangeKg}
          compareLabel="Last month"
          compareValue={stats.weightTrendLastMonthKg}
          suffix=" kg"
          goodIsDown
        />
        <Card className={STAT_TILE_CLASS}>
          <h2 className="font-sans text-[12px] text-text-muted">
            Projected goal date
          </h2>
          <div className="font-display text-heading-lg font-semibold text-text">
            {stats.goalDate} · {stats.weeksLeft} wks
          </div>
        </Card>
      </div>

      <div className="flex min-h-0 grow basis-0 gap-3.5">
        <div className="flex min-h-0 grow-2 basis-0 flex-col gap-3.5">
          <WeightTrendCard
            className={`${CARD_CLASS} grow-2 basis-0 gap-3 px-6 py-5.5`}
            chartClassName="aspect-auto min-h-0 w-full grow basis-0"
            title="Weight trend"
            data={weightTrend}
          />

          <div className="flex min-h-0 grow basis-0 flex-col gap-2.5">
            <h2 className="font-sans text-caption font-semibold text-text">
              Logged today
            </h2>
            <div className="flex min-h-0 grow basis-0 flex-col gap-2.5 overflow-y-auto">
              {meals.length === 0 && <EmptyMeals />}
              {meals.map((meal) => (
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
            <DailyCaloriesChart className="aspect-auto min-h-0 w-full grow basis-0" />
          </Card>
        </div>
      </div>

      <Disclaimer />
    </div>
  );
}
