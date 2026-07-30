import type { Sex } from './common';
import type { GoalResponse } from './goals';
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

/**
 * The Goal fields that decide whether its target has been met, picked from the
 * frozen goal response so they can never drift from the contract. `startWeightKg`
 * is what supplies direction; `preferredWeeklyChangeKg` is what identifies a
 * maintenance plan.
 */
export type GoalProgress = Pick<
  GoalResponse,
  'startWeightKg' | 'targetWeightKg' | 'preferredWeeklyChangeKg'
> & { currentWeightKg: number };
