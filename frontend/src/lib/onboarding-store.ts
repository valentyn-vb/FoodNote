import type { Pace, PutProfileRequest } from '@foodnote/shared';

/**
 * The values the onboarding form collects. Profile fields (incl. currentWeightKg)
 * come from PutProfileRequest; targetWeightKg feeds the goal + plan math.
 */
export type OnboardingFormValues = PutProfileRequest & {
  targetWeightKg: number;
};

/** Form values plus the pace picked on the form, carried to plan-selection. */
export type StoredOnboarding = OnboardingFormValues & { weeklyPace: Pace };

/**
 * Onboarding is a two-screen flow (form -> plan-selection). We stash the
 * collected values in sessionStorage so a reload or stepping back keeps them,
 * and plan-selection can compute its plans without re-fetching. It's cleared
 * once the goal is created. NOT the onboarding-complete signal — that stays
 * server-truth via GET /goals/current.
 */
const KEY = 'foodnote.onboarding';

export function saveOnboardingValues(values: StoredOnboarding): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(KEY, JSON.stringify(values));
}

export function getOnboardingValues(): StoredOnboarding | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredOnboarding;
  } catch {
    return null;
  }
}

export function clearOnboardingValues(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(KEY);
}
