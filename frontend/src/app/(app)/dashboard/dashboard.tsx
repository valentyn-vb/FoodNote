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
 *
 * No `'use client'`: this composes, it does not interact. The directive was here
 * while the numbers came from two providers, and stayed for a while after they
 * were deleted — which put this whole file and everything it composes in one
 * client bundle. The cards that need a browser (a chart, a NumberFlow digit, the
 * day nav) declare it for themselves, each becoming its own boundary.
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
  weighInCount,
  currentWeightKg,
  weightTrend,
  weightChangeKg,
  weekChangeKg,
}: DashboardFigures) {
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

      {/* The day's meals, and the week they sit in. Three fifths against two
          from `lg`: the list is the block that grows — a row per meal, each a
          name against a subtotal — while the chart is seven bars at a fixed
          height, so it takes the remainder rather than the larger share. Two
          fifths is 302px at 1024 and 454 at 1440, above the ~188 at which
          recharts starts dropping weekday labels (#123). Below `lg` they stack
          full width. The chart stretches to the list's height rather than fixing
          its own, so the row still has one height. */}
      <div className="grid gap-5 lg:grid-cols-5 lg:gap-3.5">
        <Card className="gap-0 overflow-hidden p-0 lg:col-span-3">
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
        <WeeklyIntakeCard
          className="min-h-72 lg:col-span-2"
          data={dailyCalories}
          calorieTarget={goalKcal}
        />
      </div>

      {/* Trend and split, side by side. Even at `md`, two thirds against one
          from `lg`: the ring is one figure at a fixed size, so half of 1150 left
          it drawn small in the middle of an empty card, while the trend line is
          the block that reads better the wider it gets. A third is 247px at 1024
          and 374 at 1440, which the ring fills.

          Never three across with the chart above: the shell's sidebar is a fixed
          256px, so at 1024 the content column is 768 and a third of it is
          169px. */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-3.5">
        <WeightTrendCard
          className="h-72 lg:col-span-2"
          weighInCount={weighInCount}
          trend={weightTrend}
          monthChangeKg={weightChangeKg}
          projectedGoalDate={goal.projectedGoalDate}
        />
        <DailyCaloriesCard
          className="h-72"
          segments={splitCaloriesByMealType(selectedDayMeals, remainingKcal)}
          remainingKcal={remainingKcal}
        />
      </div>
    </>
  );
}
