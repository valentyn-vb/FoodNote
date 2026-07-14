'use client';

import { useState } from 'react';
import NumberFlow from '@number-flow/react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MealLogDrawer } from '@/components/meal-log-drawer';
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

// Bar heights below are percentages lifted straight from the Paper H03/H-D
// exports (get_jsx) — not computed from calorieChartDays, since translating
// mock kcal figures into chart-accurate percentages isn't this ticket's job.
const CALORIE_BAR_HEIGHTS = ['60%', '75%', '50%', '85%', '65%', '70%', '42%'];
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
          <Card className={`${CARD_CLASS} p-4`}>
            <svg
              width="100%"
              height="90"
              viewBox="0 0 320 90"
              preserveAspectRatio="none"
            >
              <polyline
                points={stats.weightTrendPoints
                  .map(
                    (y, i) =>
                      `${(i * 320) / (stats.weightTrendPoints.length - 1)},${y}`,
                  )
                  .join(' ')}
                fill="none"
                stroke="#5BB98C"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Card>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="font-sans text-caption font-medium text-text">
            Daily calories (7 days)
          </div>
          <Card
            className={`${CARD_CLASS} h-26.5 shrink-0 flex-row items-end gap-2.5 px-4 pt-4 pb-3`}
          >
            {CALORIE_BAR_HEIGHTS.map((h, i) => (
              <div
                key={i}
                className={`grow basis-0 rounded-t-[4px] ${i === CALORIE_BAR_HEIGHTS.length - 1 ? 'bg-primary' : 'bg-[#EFECE5]'}`}
                style={{ height: h }}
              />
            ))}
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
          <MealLogDrawer onMealSaved={handleMealSaved} />
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
        <div className="flex w-56 shrink-0 flex-col gap-8 border-r border-border bg-surface px-4 py-7">
          <div className="flex items-center gap-2.25 px-1">
            <div className="font-display text-body font-semibold text-text">
              FoodNote
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            <div className="flex h-10 items-center gap-2.5 rounded-sm bg-[#FFF3E7] px-3 font-sans text-[13.5px] font-semibold text-primary-deep">
              Dashboard
            </div>
            <div className="flex h-10 items-center gap-2.5 rounded-sm px-3 font-sans text-[13.5px] text-text-muted">
              Log a meal
            </div>
            <div className="flex h-10 items-center gap-2.5 rounded-sm px-3 font-sans text-[13.5px] text-text-muted">
              Log weight
            </div>
            <div className="flex h-10 items-center gap-2.5 rounded-sm px-3 font-sans text-[13.5px] text-text-muted">
              Settings
            </div>
          </nav>
        </div>

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
            <Card className={`${CARD_CLASS} grow-2 basis-0 gap-3 px-6 py-5.5`}>
              <div className="flex items-baseline justify-between">
                <div className="font-sans text-label font-semibold text-text">
                  Weight trend & projection
                </div>
                <div className="flex gap-3.5 font-sans">
                  <div className="flex items-center gap-1.25">
                    <div className="h-0.5 w-2.5 shrink-0 bg-secondary" />
                    <div className="font-sans text-[11.5px] text-text-muted">
                      Actual
                    </div>
                  </div>
                  <div className="flex items-center gap-1.25">
                    <div className="h-0 w-2.5 shrink-0 border-t-2 border-dashed border-t-primary" />
                    <div className="font-sans text-[11.5px] text-text-muted">
                      Projected
                    </div>
                  </div>
                </div>
              </div>
              <svg
                width="100%"
                height="260"
                viewBox="0 0 600 260"
                preserveAspectRatio="none"
                className="grow basis-0"
              >
                <line x1="0" y1="65" x2="600" y2="65" stroke="#F0EEE9" />
                <line x1="0" y1="130" x2="600" y2="130" stroke="#F0EEE9" />
                <line x1="0" y1="195" x2="600" y2="195" stroke="#F0EEE9" />
                <polyline
                  points="0,80 80,95 160,88 240,120 320,110 400,140 480,130"
                  fill="none"
                  stroke="#5BB98C"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="480" cy="130" r="5" fill="#5BB98C" />
                <polyline
                  points="480,130 600,192"
                  fill="none"
                  stroke="#F5A65C"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="2 10"
                />
                <circle cx="600" cy="192" r="5" fill="#F5A65C" />
              </svg>
              <div className="flex justify-between font-sans text-[11px] text-text-muted">
                <div>10 weeks ago</div>
                <div>Today</div>
                <div>Goal · {stats.goalDate}</div>
              </div>
            </Card>

            <div className="flex min-h-0 grow basis-0 flex-col gap-3.5">
              <Card
                className={`${CARD_CLASS} grow basis-0 items-center justify-center gap-2 p-5`}
              >
                <div className="self-start font-sans text-caption font-semibold text-text">
                  Remaining today
                </div>
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#F0EEE9"
                    strokeWidth="12"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    transform="rotate(-90 60 60)"
                    fill="none"
                    stroke="#F5A65C"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${Math.round((remainingKcal / stats.goalKcal) * 314)} 314`}
                    className="transition-[stroke-dasharray] duration-500"
                  />
                  <text
                    x="60"
                    y="56"
                    textAnchor="middle"
                    className="font-display"
                    fontSize="20"
                    fontWeight="600"
                    fill="#1A1A1A"
                  >
                    {remainingKcal}
                  </text>
                  <text
                    x="60"
                    y="74"
                    textAnchor="middle"
                    className="font-sans"
                    fontSize="10"
                    fill="#6B6B6B"
                  >
                    kcal left
                  </text>
                </svg>
              </Card>
              <Card className={`${CARD_CLASS} grow basis-0 gap-2.5 p-5`}>
                <div className="font-sans text-caption font-semibold text-text">
                  7-day calories
                </div>
                <div className="flex grow basis-0 items-end gap-2">
                  {CALORIE_BAR_HEIGHTS.map((h, i) => (
                    <div
                      key={i}
                      className={`grow basis-0 rounded-t-[3px] ${i === CALORIE_BAR_HEIGHTS.length - 1 ? 'bg-primary' : 'bg-[#EFECE5]'}`}
                      style={{ height: h }}
                    />
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
