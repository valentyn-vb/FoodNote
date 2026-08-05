import { GoalReachedOverlay } from '@/components/goal-reached-overlay';
import { todayUtc } from '@/lib/dashboard-transforms';
import { getDashboard, getProfile } from '@/lib/server/reads';
import { getCurrentGoal } from '@/lib/server/session';

/**
 * Everything the reached-target dialog needs, read behind its own Suspense
 * boundary so the shell does not wait for it.
 *
 * These two reads used to sit in `(app)/layout.tsx`, where they blocked the
 * header, the sidebar and every page under them — the whole route arrived in one
 * chunk despite each page having a `loading.tsx` to show while it resolved. They
 * belong here because the dialog is their only consumer and it occupies no space:
 * a `null` fallback is not a hole in the layout, it is the same nothing the user
 * sees on every visit where no target has been reached.
 *
 * The dashboard is read only when a goal exists: `GET /dashboard` 404s until
 * onboarding is finished, and the check has to travel with the read rather than
 * stay behind in the layout.
 */
export async function GoalReachedGate() {
  const goal = await getCurrentGoal();
  const dashboard = goal ? await getDashboard(todayUtc(new Date())) : null;

  // Only the celebration needs the body figures, and only once it is going to be
  // shown — its plan step computes the options from them.
  const profile = dashboard?.goal?.reachedTarget ? await getProfile() : null;

  return (
    <GoalReachedOverlay
      goal={dashboard?.goal ?? null}
      maintenanceKcal={dashboard?.maintenanceCalories ?? null}
      profile={profile}
    />
  );
}
