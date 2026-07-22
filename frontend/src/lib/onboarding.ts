import { ApiError, goals, profile } from '@/lib/api-client';
import type { GoalResponse, ProfileResponse } from '@foodnote/shared';

export type OnboardingData = {
  profile: ProfileResponse | null;
  goal: GoalResponse | null;
};

/**
 * The persisted onboarding state — profile and active goal, fetched together.
 * Each is null when it doesn't exist yet (its GET 404s), so a brand-new user
 * gets { profile: null, goal: null }. Any non-404 failure is rethrown.
 */
export async function getOnboardingData(): Promise<OnboardingData> {
  const [profileResult, goalResult] = await Promise.allSettled([
    profile.current(),
    goals.current(),
  ]);
  return {
    profile: settledOrNull(profileResult),
    goal: settledOrNull(goalResult),
  };
}

function settledOrNull<T>(result: PromiseSettledResult<T>): T | null {
  if (result.status === 'fulfilled') return result.value;
  if (result.reason instanceof ApiError && result.reason.status === 404) {
    return null;
  }
  throw result.reason;
}
