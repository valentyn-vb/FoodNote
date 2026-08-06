import { Suspense, type ReactNode } from 'react';
import { cookies } from 'next/headers';
import { DEFAULT_APPEARANCE } from '@foodnote/shared';
import { AppShell } from '@/components/app-shell';
import { APPEARANCE_COOKIE, appearanceOrDefault } from '@/lib/appearance';
import { getProfile } from '@/lib/server/reads';
import { getCurrentUser } from '@/lib/server/session';
import { SIDEBAR_COOKIE_NAME } from '@/lib/sidebar-cookie';
import { GoalReachedGate } from './goal-reached-gate';

/**
 * The session gate is gone: there is no `useAuth()`, no `router.replace` in an
 * effect and no full-screen spinner. `proxy.ts` bounces a visitor with no session
 * before this renders, and `serverFetch` — the only door to data — redirects on a
 * 401, so the check cannot be forgotten by a page that forgets to ask.
 *
 * What it awaits is what the shell cannot be drawn without (AGENTS.md, Reading
 * data):
 *
 * - `getCurrentUser()`, because identity does not vary by route, and the header
 *   and the sidebar's menu name the user. It changes through one mutation, the
 *   profile-edit action, whose `refresh()` re-renders this layout with the page.
 * - the cookies, which carry the appearance the provider starts from and the
 *   sidebar's collapsed state.
 * - the profile, but only when the appearance cookie is absent — a device that
 *   has never chosen. The cookie is the cache and the profile is the truth (ADR
 *   0014); this read is what makes the correction one frame late instead of never,
 *   and putting it behind the boundary below would only make the flash longer.
 *
 * The reached-target dialog's reads used to be here too, and blocked all of the
 * above. They are `GoalReachedGate` now, behind a boundary of their own.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const [user, cookieStore] = await Promise.all([getCurrentUser(), cookies()]);

  // The cookie is the cache and the profile is the truth (ADR 0014), so the
  // appearance is read from the profile only when the cache is empty — a first
  // visit from a device that has never chosen. That read used to happen in the
  // browser, one frame after the page had painted in whatever the tokens said;
  // here it is one frame after only when the cookie is missing, and never at all
  // once it exists.
  const cached = cookieStore.get(APPEARANCE_COOKIE)?.value;
  const appearance = cached
    ? appearanceOrDefault(cached)
    : ((await getProfile())?.appearance ?? DEFAULT_APPEARANCE);

  // The sidebar's own cookie, which `ui/sidebar.tsx` has always written and
  // nobody read: seeded here so the first paint carries the state the provider
  // holds. Absent — a device that has never chosen — is the rail, because the
  // viewport is not knowable here and an expanded panel below 1024 leaves too
  // little for the header row. One press opens it, and that is remembered.
  const sidebarOpen = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value === 'true';

  return (
    <AppShell
      user={user}
      appearance={appearance}
      sidebarOpen={sidebarOpen}
      // `null`, not a skeleton: the dialog draws nothing until a target is
      // reached, so an un-streamed overlay looks like every ordinary visit.
      overlay={
        <Suspense fallback={null}>
          <GoalReachedGate />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
