'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import NumberFlow, { continuous, NumberFlowGroup } from '@number-flow/react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MealLogDrawer } from '@/components/meal-log-drawer';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DailyCaloriesChart,
  RemainingTodayRingCard,
  WeightTrendCard,
} from '@/components/dashboard-charts';
import {
  mockDailyCalories,
  mockDashboardStats,
  mockUserProfile,
  type Meal,
} from '@/lib/mock-data';
import { useMeals } from '@/lib/meals-context';
import { notImplemented } from '@/lib/not-implemented';

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('');
}

// REFLECT mascot: fullness mirrors intake (see design doc mascot table).
// Hungry under 50% of goal, halo while on budget, nervous sweat when over.
function fullnessMascot(eatenKcal: number, goalKcal: number) {
  if (eatenKcal > goalKcal) return '/mascot/reassure.webp';
  if (eatenKcal < goalKcal * 0.5) return '/mascot/hungry.webp';
  return '/mascot/halo.webp';
}

const CARD_CLASS =
  'rounded-lg border border-border bg-surface shadow-[0_1px_3px_#0000000a] ring-0 py-0';
const STAT_TILE_CLASS =
  'grow basis-0 gap-1.5 rounded-md border border-border bg-surface px-4.5 py-4 shadow-[0_1px_2px_#00000008] ring-0';

// Stat tile that toggles to its comparison period on click: the main number
// rolls to the other period's value (NumberFlow `continuous`) and a signed
// green/red delta fades in beside it. NumberFlowGroup keeps the two
// transitions in sync since the delta appearing shifts the main number.
function CompareStat({
  label,
  value,
  compareLabel,
  compareValue,
  suffix,
  goodIsDown,
  mascotSrc,
}: {
  label: string;
  value: number;
  compareLabel: string;
  compareValue: number;
  suffix: string;
  goodIsDown: boolean; // is a lower value the desirable direction?
  mascotSrc?: string; // state-reflecting mascot, top-right of the tile
}) {
  const [comparing, setComparing] = useState(false);
  const delta = value - compareValue;
  const good = goodIsDown ? delta < 0 : delta > 0;

  return (
    <Card
      className={`${STAT_TILE_CLASS} relative cursor-pointer select-none`}
      onClick={() => setComparing((c) => !c)}
    >
      <div className="relative z-10 font-sans text-[12px] text-text-muted">
        {comparing ? compareLabel : label}
      </div>
      <NumberFlowGroup>
        <div className="relative z-10 flex items-baseline gap-2">
          <NumberFlow
            plugins={[continuous]}
            value={comparing ? compareValue : value}
            suffix={suffix}
            format={{ maximumFractionDigits: 1 }}
            className="font-display text-heading-lg font-semibold text-text"
          />
          {comparing && (
            <NumberFlow
              value={delta}
              format={{ signDisplay: 'always', maximumFractionDigits: 1 }}
              className={`font-sans text-label font-semibold ${
                good ? 'text-secondary-deep' : 'text-error'
              }`}
            />
          )}
        </div>
      </NumberFlowGroup>
      {/* After the text in the DOM: as first child it would trigger Card's
          has-[>img:first-child]:pt-0 rule and collapse the tile's top
          padding. Absolute + z-0 → behind the text, zero layout shift;
          Card's overflow-hidden clips it into a bottom "peek". */}
      {mascotSrc && (
        <Image
          src={mascotSrc}
          alt=""
          width={76}
          height={76}
          className="absolute -bottom-2 left-[62%] z-0 -translate-x-1/2 opacity-85"
        />
      )}
    </Card>
  );
}

// ACCOMPANY mascot moment (design doc: sleeping mascot when nothing is
// logged yet). Unreachable with the seeded mock meal — becomes live once
// real data arrives.
function EmptyMeals() {
  return (
    <div className="flex flex-col items-center gap-2 py-6">
      <Image src="/mascot/accompany.webp" alt="" width={56} height={56} />
      <div className="font-sans text-caption text-text-muted">
        Nothing logged yet — your first meal starts the day.
      </div>
    </div>
  );
}

// Shared by the mobile "Logged today" list and the desktop meals column.
function MealRow({ meal }: { meal: Meal }) {
  return (
    <Card
      className={`${CARD_CLASS} flex-row items-center justify-between px-4 py-3.5`}
    >
      <div className="flex flex-col gap-0.5">
        <div className="font-sans text-label font-semibold text-text">
          {meal.name}
        </div>
        <div className="font-sans text-[12px] text-text-muted">
          {meal.source === 'ai' ? 'AI logged' : 'Manual'} · {meal.loggedAt}
        </div>
      </div>
      <div className="font-sans text-label font-semibold text-text [font-variant-numeric:tabular-nums]">
        <NumberFlow value={meal.kcal} suffix=" kcal" />
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const stats = mockDashboardStats;
  // Meals + the drawer's callbacks live in context, shared with the sidebar's
  // own "Log a meal" trigger — see meals-context.tsx.
  const {
    meals,
    eatenKcal,
    remainingKcal,
    progressPct,
    goalKcal,
    onMealSaved,
    onMealUndone,
  } = useMeals();
  const initials = initialsOf(mockUserProfile.name);
  // "Yesterday" is the second-to-last entry of the 7-day series (last = today).
  const eatenYesterday = mockDailyCalories.at(-2)!.kcal;
  const remainingYesterday = Math.max(0, goalKcal - eatenYesterday);

  return (
    <>
      {/* Mobile — up to the lg breakpoint. Desktop reuses this same route,
          not a separate page, per docs/design/foodnote-design-summary.md. */}
      <div className="flex flex-col gap-5 bg-bg px-5 pt-6 pb-8 lg:hidden">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-heading-lg font-semibold text-text">
            Today
          </h1>
          <Link href="/profile" aria-label="Open profile">
            <Avatar>
              <AvatarFallback className="bg-primary text-surface">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
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
              <NumberFlow value={stats.weightTrendKg} suffix=" kg this month" />
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
          {meals.length === 0 && <EmptyMeals />}
          {meals.map((meal) => (
            <MealRow key={meal.id} meal={meal} />
          ))}
        </div>

        <div className="flex gap-2.5 border-t border-border pt-3">
          <MealLogDrawer
            onMealSaved={onMealSaved}
            onMealUndone={onMealUndone}
          />
          <Button
            variant="outline"
            className="h-12.5 grow basis-0 rounded-sm border-border text-[13.5px] font-medium"
            onClick={() => notImplemented('Log weight')}
          >
            Log weight
          </Button>
        </div>
      </div>

      {/* Desktop — lg and up: multi-column layout, same route/data. Sidebar
          lives in the shared (app) route-group layout. */}
      <div className="hidden flex-col gap-5.5 overflow-clip bg-bg px-10 py-8 lg:flex lg:h-screen">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="text-text-muted" />
            <h1 className="font-display text-heading-lg font-semibold text-text">
              Dashboard
            </h1>
          </div>
          <Link href="/profile" aria-label="Open profile">
            <Avatar>
              <AvatarFallback className="bg-primary text-surface">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
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
            value={stats.weightTrendKg}
            compareLabel="Last month"
            compareValue={stats.weightTrendLastMonthKg}
            suffix=" kg"
            goodIsDown
          />
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
          <div className="flex min-h-0 grow-2 basis-0 flex-col gap-3.5">
            <WeightTrendCard
              className={`${CARD_CLASS} grow-2 basis-0 gap-3 px-6 py-5.5`}
              chartClassName="aspect-auto min-h-0 w-full grow basis-0"
              title="Weight trend"
            />

            <div className="flex min-h-0 grow basis-0 flex-col gap-2.5">
              <div className="font-sans text-caption font-semibold text-text">
                Logged today
              </div>
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
              className={`${CARD_CLASS} grow basis-0 items-center justify-center gap-2 p-5`}
              remainingKcal={remainingKcal}
              goalKcal={goalKcal}
            />
            <Card className={`${CARD_CLASS} grow basis-0 gap-2.5 p-5`}>
              <div className="font-sans text-caption font-semibold text-text">
                7-day calories
              </div>
              <DailyCaloriesChart className="aspect-auto min-h-0 w-full grow basis-0" />
            </Card>
          </div>
        </div>

        <div className="font-sans text-[11.5px] text-text-muted">
          This is an estimate, not medical advice. Actual results vary.
        </div>
      </div>
    </>
  );
}
