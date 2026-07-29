import type { AiParseResponse } from '@foodnote/shared';

/**
 * An AI Parse: description in, Parsed Meal out (CONTEXT.md). Never writes.
 * Abstract class, not an interface: it is both the type and the DI token,
 * matching UsersRepository. Only meals/openai/ knows which provider answers.
 */
export abstract class MealParser {
  /** `userId` is the throttle subject, not prompt input. */
  abstract parse(description: string, userId: string): Promise<AiParseResponse>;
}

export type MealParseFailureKind =
  'refusal' | 'truncated' | 'contentFilter' | 'invalidOutput' | 'transport';

/**
 * Not an HttpException: the controller owns rendering this as 502, which keeps
 * the adapter testable. Distinct from `{ parsed: false }`, which is a successful
 * recognition (ADR-0006).
 */
export class MealParseFailedError extends Error {
  constructor(
    readonly kind: MealParseFailureKind,
    message: string,
  ) {
    super(message);
    this.name = 'MealParseFailedError';
  }
}
