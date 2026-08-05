'use client';

import type { ReactNode } from 'react';
import type {
  Appearance,
  AuthUser,
  DashboardResponse,
  ProfileResponse,
} from '@foodnote/shared';
import { AppHeader } from '@/components/app-header';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { ShellFrame } from '@/components/shell-frame';
import { AppearanceProvider } from '@/components/appearance-provider';
import { GoalReachedOverlay } from '@/components/goal-reached-overlay';
import { DESKTOP_QUERY } from '@/hooks/use-media-query';

/**
 * The shared shell for the app routes, at every width: the header names the
 * route and carries the actions, and the sidebar is a sheet below 768 and a rail
 * or a panel above it.
 *
 * Split out of `(app)/layout.tsx` because the layout had to become a Server
 * Component to read the signed-in user, while this needs the client: it reads the
 * viewport to decide the sidebar's starting state, and `SidebarProvider` holds
 * that state. The user arrives as a prop rather than from a context.
 *
 * No providers left. `MealsProvider` was here so the sidebar's "Log a meal"
 * trigger shared state with the dashboard's numbers; both write through actions
 * that revalidate now, so there is no shared client state to place. The
 * reached-target dialog stays mounted here for the same reason the trigger is —
 * a weight can be logged on any route — but it takes its inputs as props.
 *
 * `OnboardingGuard` was the last of them. It wrapped this whole tree in a
 * spinner while a client request found out whether a goal existed; each `(app)`
 * page now asks `requireOnboarded()` on the server, before anything paints.
 */
export function AppShell({
  user,
  goal,
  maintenanceKcal,
  profile,
  appearance,
  children,
}: {
  user: AuthUser;
  /** Read from the cookie on the server, so the provider's first value matches the paint. */
  appearance: Appearance;
  /** Null until onboarding is finished — the shell renders before that check runs. */
  goal: DashboardResponse['goal'] | null;
  maintenanceKcal: number | null;
  /** For the reached-target dialog's plan step; null until there is one to show. */
  profile: ProfileResponse | null;
  children: ReactNode;
}) {
  return (
    // Beside MealsProvider for the same reason it is here: the sidebar's menu and
    // the section on /profile offer one setting, and one owner is what keeps them
    // agreeing.
    <AppearanceProvider initial={appearance}>
      {/* Below 1024 the panel would leave too little for the header row, so the
          rail is the starting state there. */}
      <SidebarProvider
        defaultOpen={
          typeof window === 'undefined' ||
          window.matchMedia(DESKTOP_QUERY).matches
        }
      >
        <AppSidebar user={user} />
        <SidebarInset>
          <AppHeader />
          {/* A div, not a `main`: SidebarInset is already the page's `main`.
              The flat `px-8` was 64 of the 360px a phone has. */}
          {/* `flex-1` down to the page: the shell wrapper is `min-h-svh`,
              so this makes the page column at least as tall as what is left
              of the viewport under the header — which is what lets a page
              push its own footer to the bottom with `mt-auto` instead of
              leaving it floating under short content. */}
          <div className="flex flex-1 flex-col px-4 py-5 md:px-6 lg:px-8 lg:py-6">
            <ShellFrame className="flex flex-1 flex-col">{children}</ShellFrame>
          </div>
        </SidebarInset>
        {/* The "Log weight" trigger moves between the header and the sidebar
            sheet with the width, so the celebration is mounted here — the
            nearest shared ancestor that can see either save. */}
        <GoalReachedOverlay
          goal={goal}
          maintenanceKcal={maintenanceKcal}
          profile={profile}
        />
      </SidebarProvider>
    </AppearanceProvider>
  );
}
