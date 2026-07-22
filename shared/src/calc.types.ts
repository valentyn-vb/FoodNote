import type { Sex } from './common';
import type { PutProfileRequest } from './profile';

/** The inputs the Mifflin-St Jeor BMR formula needs. */
export interface BodyMetrics {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
}

/**
 * A user's profile plus the goal endpoints the plan math needs. The profile
 * fields are reused from the frozen `PutProfileRequest` schema rather than
 * redefined here, so they can never drift from the contract.
 */
export type PlanInput = PutProfileRequest & {
  currentWeightKg: number;
  targetWeightKg: number;
};
