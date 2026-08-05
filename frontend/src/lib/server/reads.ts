// Every read goes through `serverFetch`, so this module is server-side by
// construction; the marker says so to the bundler as well (see `fetch.ts`).
import 'server-only';
import { cache } from 'react';
import {
  dashboardResponseSchema,
  listMealsResponseSchema,
  listWeightsResponseSchema,
  profileResponseSchema,
  type DashboardResponse,
  type ListMealsResponse,
  type ListWeightsResponse,
  type ProfileResponse,
} from '@foodnote/shared';
import { serverFetch, serverFetchOrNull } from './fetch';

/**
 * The app's reads, on top of `serverFetch` — which means the `shared/` schema is
 * applied here and nowhere above: no component ever holds an unvalidated shape.
 *
 * Memoized per render pass. Not for the request count on one page, which is one
 * each, but because the day's meals are read by `/dashboard` and by `/meals`, and
 * a component that wants them should be able to ask without first checking
 * whether something above it already did.
 */

/** The thin single-day read model (ADR-0005): `date` scopes the meal window only. */
export const getDashboard = cache(
  async (date: string): Promise<DashboardResponse> =>
    serverFetch(`/dashboard?date=${date}`, dashboardResponseSchema),
);

/** Inclusive UTC-day bounds. */
export const listMeals = cache(
  async (from: string, to: string): Promise<ListMealsResponse> =>
    serverFetch(`/meals?from=${from}&to=${to}`, listMealsResponseSchema),
);

export const listWeights = cache(
  async (from: string, to: string): Promise<ListWeightsResponse> =>
    serverFetch(`/weights?from=${from}&to=${to}`, listWeightsResponseSchema),
);

/**
 * One GET describes the user: the details they entered, plus the weight, goal and
 * recomputed targets mirrored onto it. `null` until onboarding writes one — a 404
 * here is the state `/onboarding` exists for, not a failure.
 *
 * Memoized, and the memo is what makes the shell's appearance fallback free on
 * `/profile`, which reads the same profile for its own page.
 */
export const getProfile = cache(async (): Promise<ProfileResponse | null> =>
  serverFetchOrNull('/profile', profileResponseSchema),
);
