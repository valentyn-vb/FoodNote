import type { PutProfileRequest } from '@foodnote/shared';

/**
 * The values the onboarding screen collects in one step. They span three
 * backend resources — profile (age/sex/heightCm/activityLevel), the first
 * weight entry (currentWeightKg), and the goal (targetWeightKg) — so this is a
 * form-only grouping, not a profile. See CONTRACT.md: weight lives in the
 * weight journal and the target lives on the goal; PUT /profile takes neither.
 */
export type OnboardingFormValues = PutProfileRequest & {
  currentWeightKg: number;
  targetWeightKg: number;
};

/**
 * Mock stand-in for persistence while the backend endpoints don't exist. The
 * form "saves" here on submit and plan-selection reads it back, simulating
 * PUT /profile + POST /weights → GET /profile (+ current weight). Module-level
 * state survives client navigation between the two steps; a full page reload
 * clears it (plan-selection then bounces back to /onboarding).
 *
 * TODO(onboarding-persistence): replace with real PUT /profile + POST /weights
 * on submit, and a GET /profile + latest-weight fetch on plan-selection.
 */
let saved: OnboardingFormValues | null = null;

export function saveOnboardingValues(values: OnboardingFormValues): void {
  saved = values;
}

export function getOnboardingValues(): OnboardingFormValues | null {
  return saved;
}
