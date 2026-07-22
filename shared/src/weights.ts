import { z } from 'zod';
import {
  dateSchema,
  idSchema,
  recordedAtSchema,
  weightKgSchema,
} from './common';

/**
 * Weight journal contract — the only place body weight is ever written.
 * A plain list of entries: POST always creates a new entry (201), any number
 * per day. currentWeightKg is derived from the entry with the latest
 * recordedAt.
 */

export const createWeightRequestSchema = z.object({
  weightKg: weightKgSchema,
  recordedAt: recordedAtSchema,
});

export const updateWeightRequestSchema = createWeightRequestSchema.partial();

export const weightEntryResponseSchema = z.object({
  id: idSchema,
  weightKg: weightKgSchema,
  recordedAt: recordedAtSchema,
});

/** GET /weights?from=YYYY-MM-DD&to=YYYY-MM-DD — inclusive UTC-day bounds. */
export const listWeightsQuerySchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});

export const listWeightsResponseSchema = z.array(weightEntryResponseSchema);

export type CreateWeightRequest = z.infer<typeof createWeightRequestSchema>;
export type UpdateWeightRequest = z.infer<typeof updateWeightRequestSchema>;
export type WeightEntryResponse = z.infer<typeof weightEntryResponseSchema>;
export type ListWeightsQuery = z.infer<typeof listWeightsQuerySchema>;
export type ListWeightsResponse = z.infer<typeof listWeightsResponseSchema>;
