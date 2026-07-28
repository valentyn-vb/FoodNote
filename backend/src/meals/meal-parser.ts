import type { AiParseResponse } from '@foodnote/shared';

/**
 * An AI Parse: turning a free-text description into a Parsed Meal (see
 * CONTEXT.md). It never writes — a confirmed Parsed Meal is persisted by the
 * caller through POST /meals with `source: 'ai'`.
 *
 * Abstract class rather than an interface so it is both the TypeScript type and
 * the runtime DI token, matching UsersRepository. Keeping the port here means
 * nothing outside openai-meal-parser.ts knows which provider answers.
 */
export abstract class MealParser {
  /**
   * `userId` is not used to shape the parse. It is the throttle subject that
   * paid for this call, so it goes to OpenAI as `safety_identifier` (their
   * abuse-detection field) and into the cost log line — never into the prompt.
   */
  abstract parse(description: string, userId: string): Promise<AiParseResponse>;
}

/**
 * Why a parse produced neither outcome. Kept as a union rather than free text
 * so the log line is groupable — the mix tells us whether truncation is real
 * (and therefore whether skipping the retry was the wrong call, see ADR-0006).
 */
export type MealParseFailureKind =
  'refusal' | 'truncated' | 'contentFilter' | 'invalidOutput' | 'transport';

/**
 * A parse that reached neither a Parsed Meal nor "not food".
 *
 * Deliberately NOT an HttpException: this is an infrastructure outcome, and the
 * controller owns the decision to render it as 502. That keeps the adapter
 * testable without asserting on HTTP artefacts.
 *
 * Distinct from `{ parsed: false }`, which is a *successful* recognition — see
 * ADR-0006.
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
