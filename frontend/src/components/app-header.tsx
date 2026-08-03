'use client';

import { usePathname } from 'next/navigation';
import { MealLogDrawer } from '@/components/meal-log-drawer';
import { WeightLogDrawer } from '@/components/weight-log-drawer';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useWeight } from '@/lib/weight-context';
import { TrendingDownIcon, UtensilsIcon } from 'lucide-react';
import { DayNav } from '@/components/day-nav';
import { useMeals } from '@/lib/meals-context';
import { cn } from '@/lib/utils';

/** The route's own name. Prefix-matched, so a future `/meals/:id` still reads
    "Meals" rather than falling through to the app name. */
const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/meals': 'Meals',
  '/profile': 'Profile',
};

function titleFor(pathname: string): string {
  const match = Object.keys(TITLES).find(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  return match ? TITLES[match] : 'FoodNote';
}

/**
 * The shared top bar of the (app) shell: the sidebar toggle, where you are, the
 * day you are logging into, and the actions the width can afford. On every
 * route at every width — below `lg` the trigger opens the sidebar as a sheet,
 * which is also the only way off /meals and /profile.
 *
 * The `new Date()` DayNav reads during render is safe here despite SSR: AppLayout
 * renders a spinner until the session is restored on the client, so this subtree
 * never takes part in hydration.
 */
export function AppHeader() {
  const pathname = usePathname();
  const { onWeightSaved } = useWeight();
  const { isToday } = useMeals();

  // The day picker only where a day is what the screen shows — which is both
  // the dashboard and /meals. #125 scoped it to the dashboard because /meals
  // carried its own copy; with that row gone the rule reads the same on both,
  // and one control in one place beats the same control in two (#130).
  const showDayNav = pathname === '/dashboard' || pathname === '/meals';

  return (
    // Below `lg` the header is dissolved into its parent so that its first row
    // can stick on its own: a sticky box sticks *inside* its parent, so a header
    // kept as a box would pin the day row along with the chrome and spend 128px
    // of an 800px viewport. At `lg` there is only one row, and the header is it:
    // three columns with equal 1fr sides, so the day picker sits on the
    // midline whatever the title and the actions happen to measure.
    <header className="contents lg:sticky lg:top-0 lg:z-10 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-2 lg:border-b lg:bg-background lg:px-4 lg:py-4">
      {/* The chrome row. `lg:contents` dissolves it in turn, so its two children
          become the header's own first and last grid columns. */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-4 py-3 md:px-6 lg:contents">
        <div className="flex min-w-0 items-center gap-2 lg:order-1">
          <SidebarTrigger />
          {/* The label of the place gives way before any control does. */}
          <h1 className="truncate font-heading text-2xl font-semibold">
            {titleFor(pathname)}
          </h1>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:order-3 lg:ml-0 lg:justify-end">
          <WeightLogDrawer
            mode="create"
            onWeightSaved={onWeightSaved}
            trigger={
              // Below 768 the row cannot hold both actions (40 + 117 + 140 of
              // 328 at 360px, before this one's 143), and calories are logged
              // many times a day where weight is logged once — so this is the
              // one that yields, to a button in the sidebar sheet.
              //
              // A weight is always stamped "now" on create, so it cannot be
              // logged onto the day the nav is showing. Off today the action is
              // disabled rather than silently writing to today (#119).
              <Button
                variant="outline"
                size="lg"
                disabled={!isToday}
                className="hidden px-6 md:inline-flex"
              >
                <TrendingDownIcon />
                Log weight
              </Button>
            }
          />
          <MealLogDrawer
            trigger={
              <Button size="lg" className="px-6">
                <UtensilsIcon />
                Log a meal
              </Button>
            }
          />
        </div>
      </div>

      {/* The cell stays even when empty: the actions only take the right-hand
          1fr while something occupies the middle column. Below `lg` its padding
          tracks the shell's own, so the row lines up with the content. */}
      <div
        className={cn('lg:order-2', showDayNav && 'px-4 pt-4 md:px-6 lg:p-0')}
      >
        {showDayNav && <DayNav />}
      </div>
    </header>
  );
}
