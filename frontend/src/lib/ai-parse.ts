import { aiParseResponseSchema, type AiParseRequest } from '@foodnote/shared';
import type { AiParseResponse } from '@foodnote/shared';
import { ApiError, apiErrorMessage } from '@/lib/api-error';

/**
 * The one call client JS still makes for itself, against
 * `app/api/meals/ai-parse/route.ts` — which is where the reason lives: a parse
 * has to be abortable, and a Server Action is not.
 *
 * Never writes. Resolves to the discriminated union: a Parsed Meal, or the "not
 * food" verdict, both of which are successful recognitions (ADR-0006). Real
 * failures reject as `ApiError` — 429 rate limit, 502 terminal model failure —
 * because the drawer draws those two differently. `signal` carries its cancel and
 * its timeout.
 */
export async function requestAiParse(
  data: AiParseRequest,
  signal?: AbortSignal,
): Promise<AiParseResponse> {
  const res = await fetch('/api/meals/ai-parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal,
  });

  if (!res.ok) throw new ApiError(res.status, await apiErrorMessage(res));

  return aiParseResponseSchema.parse(await res.json());
}
