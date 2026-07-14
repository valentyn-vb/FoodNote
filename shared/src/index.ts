import { z } from 'zod';

/**
 * API contract schemas shared between frontend and backend.
 * The backend validates responses/requests against these; the frontend
 * uses the same schemas for parsing and form validation.
 */

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  timestamp: z.string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export * from './auth';
