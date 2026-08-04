'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { ShellFrame } from '@/components/shell-frame';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/components/auth-provider';
import { OnboardingGuard } from '@/components/onboarding-guard';
import { GoalReachedOverlay } from '@/components/goal-reached-overlay';
import { DESKTOP_QUERY } from '@/hooks/use-media-query';
import { MealsProvider } from '@/lib/meals-context';
import { WeightProvider } from '@/lib/weight-context';

// Every page in the (app) group requires a session: while AuthProvider is
// restoring one (refresh cookie → access token) we show a loader; once the
// status settles as unauthenticated we bounce to /login.
//
// Once authenticated, this is the shared shell for the app routes, at every
// width: the header names the route and carries the actions, and the sidebar is
// a sheet below 768 and a rail or a panel above it. No route hand-rolls a header
// of its own any more.
// MealsProvider lives here (not in the dashboard page) so the sidebar's
// "Log a meal" trigger shares the same state as the dashboard's numbers.
export default function AppLayout({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" tone="muted" />
      </div>
    );
  }

  return (
    <OnboardingGuard>
      {/* Below 1024 the panel would leave too little for the header row, so the
          rail is the starting state there. Safe to read the viewport during
          render: the spinner above means the shell's first paint is already a
          client one, so there is no expanded→collapsed flash to hide. */}
      <SidebarProvider
        defaultOpen={
          typeof window === 'undefined' ||
          window.matchMedia(DESKTOP_QUERY).matches
        }
      >
        <MealsProvider>
          <WeightProvider>
            <AppSidebar />
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
