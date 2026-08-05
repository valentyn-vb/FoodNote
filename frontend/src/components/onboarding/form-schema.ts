import { createPlanRequestSchema, type Pace } from '@foodnote/shared';
import type { z } from 'zod';

// The details form is the plan request minus the pace, which is chosen on the
// next step — so the form derives from the request rather than listing the same
// fields a second time. It is also what `/profile`'s Edit details dialog submits,
// where the pace is likewise not on the form.
export const onboardingFormSchema = createPlanRequestSchema.omit({
  preferredWeeklyChangeKg: true,
});

export type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

// The pace isn't collected on the details form — it's chosen on the plan step.
// This is the pace pre-selected there when it's among the offered options.
export const DEFAULT_PLAN_PACE: Pace = 0.5;
