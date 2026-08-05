'use client';

import type { ReactNode } from 'react';
import type { Appearance, AuthUser } from '@foodnote/shared';
import { AppHeader } from '@/components/app-header';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { ShellFrame } from '@/components/shell-frame';
import { AppearanceProvider } from '@/components/appearance-provider';

/**
 * The shared shell for the app routes, at every width: the header names the
 * route and carries the actions, and the sidebar is a sheet below 768 and a rail
 * or a panel above it.
 *
 * Split out of `(app)/layout.tsx` because the layout had to become a Server
 * Component to read the signed-in user, while `SidebarProvider` and the overlay
 * need the client. Everything it renders from arrives as a prop rather than from
 * a context — including the sidebar's starting state, which used to be decided
 * here from `window.matchMedia` during render. That question has no answer on the
 * server, so SSR sent an expanded panel and hydration set the state to collapsed
 * without repainting: below 1024 the shell started as a panel the code meant to
 * be a rail, and the first press of the toggle was swallowed reconciling the two.
 *
 * No providers left. `MealsProvider` was here so the sidebar's "Log a meal"
 * trigger shared state with the dashboard's numbers; both write through actions
 * that revalidate now, so there is no shared client state to place. The
 * reached-target dialog still hangs here for the same reason the trigger does — a
 * weight can be logged on any route — but it arrives already rendered, from a
 * boundary of its own, so its reads no longer hold up this shell.
 *
 * `OnboardingGuard` was the last of them. It wrapped this whole tree in a
 * spinner while a client request found out whether a goal existed; each `(app)`
 * page now asks `requireOnboarded()` on the server, before anything paints.
 */
export function AppShell({
  user,
  appearance,
  sidebarOpen,
  overlay,
  children,
}: {
  user: AuthUser;
  /** Read from the cookie on the server, so the provider's first value matches the paint. */
  appearance: Appearance;
  /** The same, for the sidebar: the user's last choice, or the rail on a device that has never chosen. */
  sidebarOpen: boolean;
  /** The reached-target dialog, rendered by the server behind its own boundary. */
  overlay: ReactNode;
  children: ReactNode;
}) {
  return (
    // Beside MealsProvider for the same reason it is here: the sidebar's menu and
    // the section on /profile offer one setting, and one owner is what keeps them
    // agreeing.
    <AppearanceProvider initial={appearance}>
      <SidebarProvider defaultOpen={sidebarOpen}>
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
            sheet with the width, so the celebration hangs here — the nearest
            shared ancestor that can see either save. */}
        {overlay}
      </SidebarProvider>
    </AppearanceProvider>
  );
}
