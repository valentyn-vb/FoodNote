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
 * Profile contract. Weight is never written here: currentWeightKg is derived
 * from the latest weight entry, and maintenanceCalories / calorieTarget are
 * recomputed on every read (Mifflin-St Jeor × activity factor, minus the
 * active goal's pace deficit, clamped to the safety floor).
 *
 * PUT creates-or-replaces the profile during onboarding (full payload);
 * PATCH partially edits it from Settings. GET is 404 until the profile exists.
 */

export const putProfileRequestSchema = z.object({
  age: ageSchema,
  sex: sexSchema,
  heightCm: heightCmSchema,
  activityLevel: activityLevelSchema,
});

export const patchProfileRequestSchema = putProfileRequestSchema.partial();

export const profileResponseSchema = z.object({
  age: ageSchema,
  sex: sexSchema,
  heightCm: heightCmSchema,
  activityLevel: activityLevelSchema,
  // Derived, read-only. Null until the first weight entry exists.
  currentWeightKg: weightKgSchema.nullable(),
  maintenanceCalories: caloriesSchema.nullable(),
  calorieTarget: caloriesSchema.nullable(),
});

export type PutProfileRequest = z.infer<typeof putProfileRequestSchema>;
export type PatchProfileRequest = z.infer<typeof patchProfileRequestSchema>;
export type ProfileResponse = z.infer<typeof profileResponseSchema>;
