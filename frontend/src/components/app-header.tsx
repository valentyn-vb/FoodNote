'use client';

import { usePathname } from 'next/navigation';
import { LogWeightAction } from '@/components/log-weight-action';
import { MealLogDrawer } from '@/components/meal-log-drawer';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ShellFrame } from '@/components/shell-frame';
import { useIsMobile } from '@/hooks/use-mobile';
import { UtensilsIcon } from 'lucide-react';

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
  // The same 768 the sidebar's sheet uses, and gated in JS rather than with
  // `hidden md:inline-flex`: a CSS-hidden trigger leaves its drawer mounted, so
  // the phone carried this one *and* the sheet's copy.
  const isMobile = useIsMobile();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center border-b bg-background px-4 md:px-6 lg:h-18 lg:px-4">
      {/* The same frame the page content sits in, so the actions stop where the
          content does instead of running to the edge of a 4K display. */}
      <ShellFrame className="flex items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="touch-target" />
          {/* The label of the place gives way before any control does. */}
          <h1 className="truncate font-heading text-2xl font-semibold">
            {titleFor(pathname)}
          </h1>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* Below 768 the row cannot hold both actions (40 + 117 + 140 of 328
            at 360px, before this one's 143), and calories are logged many times
            a day where weight is logged once — so this is the one that yields,
            to a button in the sidebar sheet. */}
          {!isMobile && <LogWeightAction className="px-6" />}
          <MealLogDrawer
            trigger={
              <Button size="lg" className="px-6">
                <UtensilsIcon className="mr-1" />
                Log a meal
              </Button>
            }
          />
        </div>
      </ShellFrame>
    </header>
  );
}
