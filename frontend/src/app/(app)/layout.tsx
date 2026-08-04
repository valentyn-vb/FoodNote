import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { getCurrentUser } from '@/lib/server/session';

/**
 * The session gate is gone: there is no `useAuth()`, no `router.replace` in an
 * effect and no full-screen spinner. `proxy.ts` bounces a visitor with no session
 * before this renders, and `serverFetch` — the only door to data — redirects on a
 * 401, so the check cannot be forgotten by a page that forgets to ask.
 *
 * This layout reads `getCurrentUser()`, which is the one written-down exception
 * to the rule that data is read at page level. The rule exists because layouts do
 * not re-render on navigation, so what they must not hold is data that *varies by
 * route* — identity does not. It changes through exactly one mutation, the
 * profile-edit action, which revalidates this layout explicitly.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return <AppShell user={user}>{children}</AppShell>;
}
