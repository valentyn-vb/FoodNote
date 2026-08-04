import { cache } from 'react';
import {
  dashboardResponseSchema,
  listMealsResponseSchema,
  listWeightsResponseSchema,
  type DashboardResponse,
  type ListMealsResponse,
  type ListWeightsResponse,
} from '@foodnote/shared';
import { serverFetch } from './fetch';

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
