import { Logger } from '@nestjs/common';
import type OpenAI from 'openai';
import { aiParseResponseSchema } from '@foodnote/shared';
import type { AiParseResponse } from '@foodnote/shared';
import {
  MealParseFailedError,
  MealParser,
  type MealParseFailureKind,
} from '../meal-parser';
import {
  MAX_OUTPUT_TOKENS,
  MEAL_PARSE_MODEL,
  REASONING_EFFORT,
  SYSTEM_PROMPT,
} from './constants';
import { MEAL_PARSE_FORMAT, type ParsedModelResponse } from './model-schema';
import { findRefusal, usageOf } from './response';

type ParseLogFields = {
  outcome: 'meal' | 'notFood' | 'failed';
  failureKind?: MealParseFailureKind;
  userId: string;
  inputTokens?: number;
  outputTokens?: number;
  openaiRequestId?: string;
};

export class OpenAiMealParser implements MealParser {
  /** Metadata only — a description is dietary data about an identified user. */
  private readonly logger = new Logger('MealParse');

  constructor(private readonly client: OpenAI) {}

  async parse(description: string, userId: string): Promise<AiParseResponse> {
    const startedAt = process.hrtime.bigint();
    // Stays undefined on a transport failure, so no token counts are logged.
    let response: ParsedModelResponse | undefined;

    try {
      response = await this.request(description, userId);
      const result = this.toResult(response);
      this.logParse(startedAt, {
        outcome: result.parsed ? 'meal' : 'notFood',
        userId,
        ...usageOf(response),
      });
      return result;
    } catch (error) {
      this.logParse(startedAt, {
        outcome: 'failed',
        failureKind:
          error instanceof MealParseFailedError ? error.kind : 'transport',
        userId,
        ...usageOf(response),
      });
      throw error;
    }
  }

  /** Maps the model's union onto the frozen wire contract. */
  private toResult(response: ParsedModelResponse): AiParseResponse {
    if (response.status === 'incomplete') {
      const reason = response.incomplete_details?.reason;
      throw new MealParseFailedError(
        reason === 'content_filter' ? 'contentFilter' : 'truncated',
        `The model stopped early (${reason ?? 'unknown reason'}).`,
      );
    }

    const refusal = findRefusal(response.output);
    if (refusal) {
      throw new MealParseFailedError('refusal', refusal);
    }

    if (!response.output_parsed) {
      throw new MealParseFailedError(
        'invalidOutput',
        'The model returned output that did not match the parse schema.',
      );
    }

    // Field by field, not a spread off the discriminant: keeps the narrowing and
    // drops the model-only `kind`.
    const { result } = response.output_parsed;
    const mapped =
      result.kind === 'notFood'
        ? { parsed: false, reason: result.reason }
        : {
            parsed: true,
            meal: {
              mealName: result.mealName,
              items: result.items,
              totalCalories: result.totalCalories,
              proteinGrams: result.proteinGrams,
              carbsGrams: result.carbsGrams,
              fatGrams: result.fatGrams,
              confidenceNote: result.confidenceNote,
            },
          };

    // The model schema is not the wire contract, so re-check before shipping.
    const validated = aiParseResponseSchema.safeParse(mapped);
    if (!validated.success) {
      throw new MealParseFailedError(
        'invalidOutput',
        `The parsed meal did not satisfy the contract: ${validated.error.message}`,
      );
    }
    return validated.data;
  }

  private async request(
    description: string,
    userId: string,
  ): Promise<ParsedModelResponse> {
    try {
      return await this.client.responses.parse({
        model: MEAL_PARSE_MODEL,
        max_output_tokens: MAX_OUTPUT_TOKENS,
        reasoning: { effort: REASONING_EFFORT },
        // Abuse-detection field, not part of the prompt.
        safety_identifier: userId,
        text: { format: MEAL_PARSE_FORMAT },
        input: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: description },
        ],
      });
    } catch (cause) {
      // The SDK's own retries are already spent by this point.
      throw new MealParseFailedError(
        'transport',
        cause instanceof Error ? cause.message : 'The parse request failed.',
      );
    }
  }

  private logParse(startedAt: bigint, fields: ParseLogFields): void {
    this.logger.log(
      JSON.stringify({
        ...fields,
        model: MEAL_PARSE_MODEL,
        latencyMs: Number((process.hrtime.bigint() - startedAt) / 1_000_000n),
      }),
    );
  }
}
