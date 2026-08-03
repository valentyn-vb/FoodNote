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
 * day you are logging into, and the one action every screen offers.
 *
 * Desktop only, like the rest of the chrome — the sidebar it toggles is
 * `hidden lg:contents`, so below `lg` the trigger would open nothing and each
 * route's own `lg:hidden` block still owns its header.
 *
 * The `new Date()` DayNav reads during render is safe here despite SSR: AppLayout
 * renders a spinner until the session is restored on the client, so this subtree
 * never takes part in hydration.
 */
export function AppHeader() {
  const pathname = usePathname();
  const { onWeightSaved } = useWeight();
  const { isToday } = useMeals();

  return (
    // Three columns with equal 1fr sides: the day picker sits on the header's
    // midline whatever the title and the action pair happen to measure, and
    // unlike absolute centring it can't end up underneath either of them.
    <header className="sticky top-0 z-10 hidden grid-cols-[1fr_auto_1fr] items-center gap-2 border-b bg-background px-4 py-4 lg:grid">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <h1 className="font-heading text-2xl font-semibold">
          {titleFor(pathname)}
        </h1>
      </div>

      {/* The day picker only where a day is what the screen shows: on Profile or
          Meals it would be a control that changes nothing. The cell itself stays
          either way — drop it and the actions become the second grid child and
          take the middle column. */}
      <div>{pathname === '/dashboard' && <DayNav />}</div>

      <div className="flex items-center justify-end gap-2">
        <WeightLogDrawer
          mode="create"
          onWeightSaved={onWeightSaved}
          trigger={
            // A weight is always stamped "now" on create, so it cannot be
            // logged onto the day the nav is showing. Off today the action is
            // disabled rather than silently writing to today (#119) — the gate
            // the sidebar carried before these actions moved up here.
            <Button
              variant="outline"
              size="lg"
              disabled={!isToday}
              className="px-6"
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
