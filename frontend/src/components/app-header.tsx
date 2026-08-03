'use client';

import { usePathname } from 'next/navigation';
import { MealLogDrawer } from '@/components/meal-log-drawer';
import { WeightLogDrawer } from '@/components/weight-log-drawer';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useWeight } from '@/lib/weight-context';
import { TrendingDownIcon, UtensilsIcon } from 'lucide-react';
import { useMeals } from '@/lib/meals-context';

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
 * The shared top bar of the (app) shell: the sidebar toggle, where you are, and
 * the actions the width can afford. On every route at every width — below `lg`
 * the trigger opens the sidebar as a sheet, which is also the only way off
 * /meals and /profile.
 *
 * One row, so the whole header is what sticks. The day picker lives on the two
 * pages that show a day, not here.
 */
export function AppHeader() {
  const pathname = usePathname();
  const { onWeightSaved } = useWeight();
  const { isToday } = useMeals();

  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-4 py-3 md:px-6 lg:px-4 lg:py-4">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className="touch-target" />
        {/* The label of the place gives way before any control does. */}
        <h1 className="truncate font-heading text-2xl font-semibold">
          {titleFor(pathname)}
        </h1>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <WeightLogDrawer
          mode="create"
          onWeightSaved={onWeightSaved}
          trigger={
            // Below 768 the row cannot hold both actions (40 + 117 + 140 of 328
            // at 360px, before this one's 143), and calories are logged many
            // times a day where weight is logged once — so this is the one that
            // yields, to a button in the sidebar sheet.
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
    </header>
  );
}
