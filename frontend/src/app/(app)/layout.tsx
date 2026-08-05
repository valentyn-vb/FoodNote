import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { DEFAULT_APPEARANCE } from '@foodnote/shared';
import { AppShell } from '@/components/app-shell';
import { APPEARANCE_COOKIE, appearanceOrDefault } from '@/lib/appearance';
import { todayUtc } from '@/lib/dashboard-transforms';
import { getDashboard, getProfile } from '@/lib/server/reads';
import { getCurrentGoal, getCurrentUser } from '@/lib/server/session';

/**
 * The session gate is gone: there is no `useAuth()`, no `router.replace` in an
 * effect and no full-screen spinner. `proxy.ts` bounces a visitor with no session
 * before this renders, and `serverFetch` — the only door to data — redirects on a
 * 401, so the check cannot be forgotten by a page that forgets to ask.
 *
 * Three reads happen here rather than at page level, and each is an exception
 * worth stating rather than hiding:
 *
 * - `getCurrentUser()`, because identity does not vary by route. The rule exists
 *   because layouts do not re-render on navigation, so what they must not hold is
 *   route-varying data. Identity changes through one mutation, the profile-edit
 *   action, which revalidates this layout explicitly.
 * - the present-state half of the dashboard, for the reached-target dialog. That
 *   dialog is mounted here because a weight can be logged from the header or the
 *   sidebar sheet on any route, so it has to outlive the page — and what it needs
 *   (`reachedTarget`, the current weight, maintenance calories) is present-state
 *   too: `?date=` scopes only the meal window, never the goal block.
 * - the profile, and only for its `appearance`, and only when the cookie that
 *   caches it is absent. The appearance is a property of the user, not of a
 *   route, and the shell is what carries it.
 *
 * The dashboard read is skipped entirely when there is no goal, because
 * `GET /dashboard` 404s until onboarding is finished and this layout renders
 * around `/onboarding` redirects rather than in front of them. `getCurrentGoal()`
 * is memoized, so the check costs the page's own read, not a second one.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const [user, goal, cookieStore] = await Promise.all([
    getCurrentUser(),
    getCurrentGoal(),
    cookies(),
  ]);

  const dashboard = goal ? await getDashboard(todayUtc(new Date())) : null;

  // The cookie is the cache and the profile is the truth (ADR 0014), so the
  // profile is read only when the cache is empty — a first visit from a device
  // that has never chosen. That read used to happen in the browser, one frame
  // after the page had painted in whatever the tokens said; here it is one frame
  // after only when the cookie is missing, and never at all once it exists.
  const cached = cookieStore.get(APPEARANCE_COOKIE)?.value;
  const appearance = cached
    ? appearanceOrDefault(cached)
    : ((await getProfile())?.appearance ?? DEFAULT_APPEARANCE);

  return (
    <AppShell
      user={user}
      appearance={appearance}
      goal={dashboard?.goal ?? null}
      maintenanceKcal={dashboard?.maintenanceCalories ?? null}
    >
      {children}
    </AppShell>
  );
}
