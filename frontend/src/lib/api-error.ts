import { errorResponseSchema } from '@foodnote/shared';

/**
 * One error type for both doors to Nest — the client-side `api-client.ts` and
 * the server-side `server/fetch.ts`.
 *
 * It has to be one class rather than one shape: call sites branch with
 * `err instanceof ApiError && err.status === 404`, and `instanceof` is false
 * across two identically-shaped classes. A second declaration would make those
 * checks silently depend on which door the error came through.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * The human-readable half of Nest's error envelope.
 *
 * Only `message` is picked from `errorResponseSchema`: `ZodValidationPipe`
 * throws `BadRequestException({ message, errors })`, and Nest sends an object
 * payload verbatim — so the `statusCode` the full envelope requires is absent
 * on exactly the responses whose message matters most. The union is worth
 * reusing regardless: a thrown `HttpException` gives a string, a class-validator
 * rejection gives an array.
 *
 * Anything that does not parse — an HTML 502 from a proxy, an empty body —
 * falls back to the status line.
 */
const errorMessageSchema = errorResponseSchema.pick({ message: true });

export async function apiErrorMessage(res: Response): Promise<string> {
  try {
    const parsed = errorMessageSchema.safeParse(await res.json());
    if (!parsed.success) return res.statusText;
    const { message } = parsed.data;
    return Array.isArray(message) ? message.join(', ') : message;
  } catch {
    return res.statusText;
  }
}
