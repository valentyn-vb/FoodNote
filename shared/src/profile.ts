import { z } from 'zod';
import {
  activityLevelSchema,
  ageSchema,
  caloriesSchema,
  heightCmSchema,
  sexSchema,
  weightKgSchema,
} from './common';
import { paceSchema } from './goals';

/**
 * Profile contract. Weight and goal are never written here, but the read
 * mirrors them so a single GET fully describes the user: currentWeightKg comes
 * from the latest weight entry; targetWeightKg / preferredWeeklyChangeKg come
 * from the active goal; maintenanceCalories / calorieTarget are recomputed on
 * every read (Mifflin-St Jeor × activity factor, minus the active goal's pace
 * deficit, clamped to the safety floor). All are null until their source
 * (a weight entry / an active goal) exists.
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
  // Mirrored from the active goal, read-only here. Null until one exists.
  targetWeightKg: weightKgSchema.nullable(),
  preferredWeeklyChangeKg: paceSchema.nullable(),
});

export type PutProfileRequest = z.infer<typeof putProfileRequestSchema>;
export type PatchProfileRequest = z.infer<typeof patchProfileRequestSchema>;
export type ProfileResponse = z.infer<typeof profileResponseSchema>;
