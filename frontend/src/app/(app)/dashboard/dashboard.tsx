'use client';

import { useRouter } from 'next/navigation';
import { DayNav } from '@/components/day-nav';
import { Disclaimer } from '@/components/disclaimer';
import { EmptyMeals } from '@/components/empty-meals';
import { MealGroupsAccordion } from '@/components/meal-groups-accordion';
import { Card } from '@/components/ui/card';
import {
  goalDirection,
  splitCaloriesByMealType,
} from '@/lib/dashboard-transforms';
import { CurrentGoalCard } from './current-goal-card';
import { CurrentWeightCard } from './current-weight-card';
import { DailyCaloriesCard } from './daily-calories-card';
import { EatenCard } from './eaten-card';
import { formatFigure } from './helpers';
import { RemainingCard } from './remaining-card';
import type { DashboardFigures } from './figures';
import { WeeklyIntakeCard } from './weekly-intake-card';
import { WeightTrendCard } from './weight-trend-card';

/**
 * The day's numbers, in seven widgets and one DOM: a band of four stat cards
 * over a band of three charts, stacked in source order on a phone.
 *
 * Both bands are laid out against the **content column**, not the viewport,
 * because the shell's sidebar is a fixed 256px — 1024 leaves 768 of usable
 * width and 1440 leaves 1150, so a breakpoint alone would size these wrong at
 * one end or the other. Each band says below how it handles that.
 *
 * Calorie widgets follow the selected Tracking Day; weight and goal are always
 * present-state, which is what the API serves — `date` scopes only the meal
 * window (ADR-0005). The calorie labels say which day they mean.
 */
export function Dashboard({
  selectedDate,
  ...figures
}: DashboardFigures & { selectedDate: string }) {
  return (
    <div className="flex grow flex-col gap-5 lg:gap-4">
      <div className="flex justify-center">
        <DayNav selectedDate={selectedDate} />
      </div>

      <DashboardBands {...figures} />

      {/* Last at every width, and outside the gate so it doesn't appear from
          nowhere when the data lands — it says the numbers are estimates, which
          is true of the skeleton's numbers too.

          `mt-auto` pins it to the bottom of the screen when the day is short
          enough to leave room, and lets it sit at the end of the page when it
          isn't. Not `sticky`: a footnote that follows the scroll is a band
          across every screen, and this one is worth reading once. */}
      <Disclaimer className="mt-auto" />
    </div>
  );
}

/**
 * The seven blocks. `goal` is non-null by type because the page cannot render
 * without it — `requireOnboarded()` redirects first — which is what the gate's
 * 'ready' state used to buy.
 */
function DashboardBands({
  goal,
  eatenKcal,
  remainingKcal,
  progressPct,
  goalKcal,
  macros,
  selectedDayMeals,
  dailyCalories,
  isToday,
  weightEntries,
  currentWeightKg,
  weightTrend,
  weightChangeKg,
  weekChangeKg,
}: DashboardFigures) {
  const router = useRouter();

  const direction = goalDirection(
    goal.startWeightKg,
    goal.targetWeightKg,
    goal.preferredWeeklyChangeKg,
  );

  return (
    <>
      {/* Two pairs, not four cards. The row has to be 1, 2 or 4 columns
          wide — three leaves an orphan on a second row — and no single
          breakpoint gets that right, because the shell's sidebar is a fixed
          256px: the content column is 768 at 1024 and 1150 at 1440, and
          four cards fit only in the second. So the pairs wrap on width and
          each pair splits in two, which can never produce three. */}
      {/* `min(30rem,100%)`, not a bare 30rem: a minmax floor is a hard
          minimum, so a 480px track on a 360px phone lays the page out 496
          wide and clips the right edge off every card. */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(30rem,100%),1fr))] gap-5 lg:gap-3.5">
        <div className="grid gap-5 md:grid-cols-2 lg:gap-3.5">
          <RemainingCard
            label={isToday ? 'Remaining today' : 'Remaining'}
            remainingKcal={remainingKcal}
            eatenKcal={eatenKcal}
            goalKcal={goalKcal}
            progressPct={progressPct}
          />
          <EatenCard
            label={isToday ? 'Eaten today' : 'Eaten'}
            eatenKcal={eatenKcal}
            {...macros}
          />
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:gap-3.5">
          <CurrentWeightCard
            label={isToday ? 'Current weight' : 'Weight that day'}
            currentWeightKg={currentWeightKg}
            targetWeightKg={goal.targetWeightKg}
            weekChangeKg={weekChangeKg}
            direction={direction}
          />
          <CurrentGoalCard
            direction={direction}
            calorieTarget={goalKcal}
            pace={goal.preferredWeeklyChangeKg}
            projectedGoalDate={goal.projectedGoalDate}
            reachedTarget={goal.reachedTarget}
          />
        </div>
      </div>

      {/* The day's own two blocks: what was eaten, and where it went.
          Two thirds against one from `lg`, not an even split: the meal list
          grows a row per meal while the ring is one figure at a fixed size, so
          half the row left the ring swimming in its own card. A third of the
          content column is 256px at 1024 and 383 at 1440, which the ring reads
          well at; below `lg` they stack, where a third would be 200px or less.
          The ring stretches to the list's height rather than fixing its own, so
          the row still has one height. */}
      <div className="grid gap-5 lg:grid-cols-3 lg:gap-3.5">
        <Card className="gap-0 overflow-hidden p-0 lg:col-span-2">
          {/* Title over a line of context, the shape ChartCard gives the three
              cards beside it — this one composes Card directly because the
              accordion runs edge to edge, which a padded body cannot do. */}
          <div className="flex flex-wrap items-start justify-between gap-x-3 px-5 pt-5 pb-4">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-semibold">
                {isToday ? "Today's meals" : 'Meals that day'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Grouped by meal time
              </p>
            </div>
            {/* The day's two totals, opposite the title: the same summary
                the meal-time rows carry, for the day as a whole. The
                figures carry the weight, the words stay quiet.

                Absent on an empty day rather than reading "0 meals · 0 kcal":
                the empty state below already says nothing was logged, and a
                row of zeroes beside it states it a second time. */}
            {selectedDayMeals.length > 0 && (
              <p className="text-sm text-muted-foreground tabular-nums">
                <span className="font-semibold text-foreground">
                  {selectedDayMeals.length}
                </span>
                {selectedDayMeals.length === 1 ? ' meal · ' : ' meals · '}
                <span className="font-semibold text-foreground">
                  {formatFigure(eatenKcal)}
                </span>
                {' kcal'}
              </p>
            )}
          </div>
          {selectedDayMeals.length === 0 ? (
            <EmptyMeals />
          ) : (
            <MealGroupsAccordion meals={selectedDayMeals} />
          )}
        </Card>
        <DailyCaloriesCard
          className="min-h-72"
          segments={splitCaloriesByMealType(selectedDayMeals, remainingKcal)}
          remainingKcal={remainingKcal}
        />
      </div>

      {/* The two week-scale charts, side by side. Never three across:
          the shell's sidebar is a fixed 256px, so at 1024 the content
          column is 768 and a third of it is 169px — under the ~188 at
          which recharts starts dropping weekday labels (#123). */}
      <div className="grid gap-5 md:grid-cols-2 lg:gap-3.5">
        <WeightTrendCard
          className="h-72"
          entries={weightEntries}
          // A journal edit used to tell the provider to refetch; it re-renders
          // the server tree instead, which is the only thing that can move the
          // trend, the change stat and the goal tile together.
          onWeightsChanged={() => router.refresh()}
          trend={weightTrend}
          monthChangeKg={weightChangeKg}
          projectedGoalDate={goal.projectedGoalDate}
        />
        <WeeklyIntakeCard
          className="h-72"
          data={dailyCalories}
          calorieTarget={goalKcal}
        />
      </div>
    </>
  );
}
