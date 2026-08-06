import { z } from 'zod';
import { weightKgSchema } from './common';
import { paceSchema } from './goals';
import { putProfileRequestSchema } from './profile';

/**
 * Plan contract — the one transactional write onboarding makes.
 *
 * A Plan is a Profile, a first Weight Entry and a Goal committed together; it is
 * stored under none of those names and read back through `GET /goals/current`
 * and `GET /profile`, so there is no `GET /api/plan`. The endpoint exists because
 * `POST /goals` requires an existing weight entry, and that invariant otherwise
 * leaks into the client as a fixed call order.
 *
 * POST, not PUT: every call appends to the append-only weight journal (ADR-0004),
 * so two calls do not leave the state of one. A user who already has an active
 * goal gets a 409 rather than a replacement — see docs/adr/0016. Changing a plan
 * afterwards is `PATCH /profile` + `PATCH /goals/current`.
 *
 * `recordedAt` is deliberately absent: the goal's `startWeightKg` is derived from
 * the latest weight entry, so a client clock would otherwise get a say in where
 * the goal starts. The weight in a Plan means "what I weigh at the moment of
 * committing", and the server owns that moment.
 */
export const createPlanRequestSchema = putProfileRequestSchema.extend({
  currentWeightKg: weightKgSchema,
  targetWeightKg: weightKgSchema,
  preferredWeeklyChangeKg: paceSchema,
});

export type CreatePlanRequest = z.infer<typeof createPlanRequestSchema>;
