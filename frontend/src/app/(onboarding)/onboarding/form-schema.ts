import {
  putProfileRequestSchema,
  weightKgSchema,
  type Pace,
} from '@foodnote/shared';
import type { z } from 'zod';

export const onboardingFormSchema = putProfileRequestSchema.extend({
  targetWeightKg: weightKgSchema,
});

export type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

export const ONBOARDING_DEFAULTS: OnboardingFormValues = {
  age: 27,
  sex: 'female',
  heightCm: 168,
  activityLevel: 'light',
  currentWeightKg: 72,
  targetWeightKg: 64,
};

// The pace isn't collected on the form — it's chosen on plan-selection. The
// goal is created with this default so the target/pace are persisted (and
// fetchable) once the form is submitted.
export const DEFAULT_GOAL_PACE: Pace = 0.5;
