'use client';

import type { ReactNode } from 'react';
import type { AuthUser } from '@foodnote/shared';
import { AppHeader } from '@/components/app-header';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { ShellFrame } from '@/components/shell-frame';
import { OnboardingGuard } from '@/components/onboarding-guard';
import { GoalReachedOverlay } from '@/components/goal-reached-overlay';
import { DESKTOP_QUERY } from '@/hooks/use-media-query';
import { MealsProvider } from '@/lib/meals-context';
import { WeightProvider } from '@/lib/weight-context';

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
 * `MealsProvider` lives here rather than in the dashboard page so the sidebar's
 * "Log a meal" trigger shares state with the dashboard's numbers. Both providers
 * and `OnboardingGuard` are on their way out — they belong to the slices that
 * follow this one.
 */
export function AppShell({
  user,
  children,
}: {
  user: AuthUser;
  children: ReactNode;
}) {
  return (
    <OnboardingGuard>
      {/* Below 1024 the panel would leave too little for the header row, so the
          rail is the starting state there. */}
      <SidebarProvider
        defaultOpen={
          typeof window === 'undefined' ||
          window.matchMedia(DESKTOP_QUERY).matches
        }
      >
        <MealsProvider>
          <WeightProvider>
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
                <ShellFrame className="flex flex-1 flex-col">
                  {children}
                </ShellFrame>
              </div>
            </SidebarInset>
            {/* The "Log weight" trigger moves between the header and the sidebar
                sheet with the width, so the celebration is mounted here — the
                nearest shared ancestor that can see either save. */}
            <GoalReachedOverlay />
          </WeightProvider>
        </MealsProvider>
      </SidebarProvider>
    </OnboardingGuard>
  );
}
