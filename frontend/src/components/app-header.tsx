'use client';

import { usePathname } from 'next/navigation';
import { MealLogDrawer } from '@/components/meal-log-drawer';
import { WeightLogDrawer } from '@/components/weight-log-drawer';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useWeight } from '@/lib/weight-context';
import { TrendingDownIcon, UtensilsIcon } from 'lucide-react';

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
 * `new Date()` during render is safe here despite SSR: AppLayout renders a
 * spinner until the session is restored on the client, so this never takes part
 * in hydration.
 */
export function AppHeader() {
  const pathname = usePathname();
  const { onWeightSaved } = useWeight();
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="sticky top-0 z-10 hidden items-center gap-2 border-b bg-background px-4 py-2 lg:flex">
      <SidebarTrigger className="self-start" />
      <div className="flex flex-col">
        <h1 className="font-heading text-2xl font-semibold">
          {titleFor(pathname)}
        </h1>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>
      {/* Both logging actions used to be sidebar rows; they live here now, so
          they stay reachable with the rail collapsed and read as actions
          rather than as navigation. Same order and pairing as the mobile
          action bar in `mobile-dashboard`. */}
      <div className="ml-auto flex items-center gap-2">
        <WeightLogDrawer
          mode="create"
          onWeightSaved={onWeightSaved}
          trigger={
            <Button variant="secondary" size="lg" className="px-6">
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
