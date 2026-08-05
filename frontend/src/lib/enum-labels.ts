import type { ActivityLevel, Sex } from '@foodnote/shared';

/**
 * Display copy for the domain's closed sets. The values are the contract
 * (`shared/`); the wording a user sees lives here, because the profile's details
 * list and onboarding's review step show the same two enums and would otherwise
 * each spell them out.
 */
export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary',
  light: 'Light',
  moderate: 'Moderate',
  active: 'Active',
  veryActive: 'Very active',
};

export const SEX_LABELS: Record<Sex, string> = {
  female: 'Female',
  male: 'Male',
};
