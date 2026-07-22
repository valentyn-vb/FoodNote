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

// The pace isn't collected on the details form — it's chosen on the plan step.
// This is the pace pre-selected there when it's among the offered options.
export const DEFAULT_PLAN_PACE: Pace = 0.5;
