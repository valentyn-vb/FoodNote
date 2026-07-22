import { z } from 'zod';
import {
  activityLevelSchema,
  ageSchema,
  caloriesSchema,
  heightCmSchema,
  sexSchema,
  weightKgSchema,
} from './common';

/**
 * Profile contract. `currentWeightKg` on the request is a compute input, not a
 * stored field: the backend uses it to derive `maintenanceCalories` on the
 * response without reading the journal, but does not persist it — the weight
 * journal (POST /weights) remains weight's single source of truth.
 * `calorieTarget` is not a profile value: it depends on the active goal's pace,
 * so it's the goal's concern and is null on the profile response.
 *
 * PUT creates-or-replaces the profile during onboarding (full payload);
 * PATCH partially edits it from Settings. GET is 404 until the profile exists.
 */

export const putProfileRequestSchema = z.object({
  age: ageSchema,
  sex: sexSchema,
  heightCm: heightCmSchema,
  activityLevel: activityLevelSchema,
  // Compute input for maintenanceCalories; not persisted (see above).
  currentWeightKg: weightKgSchema,
});

export const patchProfileRequestSchema = putProfileRequestSchema.partial();

export const profileResponseSchema = z.object({
  age: ageSchema,
  sex: sexSchema,
  heightCm: heightCmSchema,
  activityLevel: activityLevelSchema,
  // Read-only. currentWeightKg echoes the request; maintenanceCalories is
  // derived from it. calorieTarget is always null here — it belongs to the goal.
  currentWeightKg: weightKgSchema.nullable(),
  maintenanceCalories: caloriesSchema.nullable(),
  calorieTarget: caloriesSchema.nullable(),
});

export type PutProfileRequest = z.infer<typeof putProfileRequestSchema>;
export type PatchProfileRequest = z.infer<typeof patchProfileRequestSchema>;
export type ProfileResponse = z.infer<typeof profileResponseSchema>;
