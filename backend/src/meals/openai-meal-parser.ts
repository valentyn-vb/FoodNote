import { Logger } from '@nestjs/common';
import type OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type { ParsedResponse } from 'openai/resources/responses/responses';
import { z } from 'zod';
import {
  aiParseResponseSchema,
  caloriesSchema,
  macroGramsSchema,
} from '@foodnote/shared';
import type { AiParseResponse } from '@foodnote/shared';
import {
  MealParseFailedError,
  MealParser,
  type MealParseFailureKind,
} from './meal-parser';

/**
 * Pinned rather than configurable: the prompt and the model are a matched pair,
 * and an env var would let prod drift onto a model nobody tested this prompt
 * against. Same reasoning as the rate limits in common/throttle.constants.ts.
 */
const MEAL_PARSE_MODEL = 'gpt-5-mini';

/**
 * A ceiling, not a spend — you are billed for tokens actually generated. It is
 * deliberately loose because reasoning tokens count against this budget and
 * truncation is terminal (no retry, ADR-0006), so it must not be reachable. A
 * schema-bounded Parsed Meal is ~300 tokens.
 */
const MAX_OUTPUT_TOKENS = 2000;

/**
 * The floor for this model, not a preference: gpt-5-mini rejects 'none' with
 * "Unsupported value ... Supported values are: 'minimal', 'low', 'medium', and
 * 'high'", so every request 502s on it. Measured at ~8s for a three-item meal,
 * which is over half the 15s timeout — if that needs to come down, the lever is
 * a non-reasoning model (gpt-4o-mini), not this constant.
 */
const REASONING_EFFORT = 'minimal';

/**
 * The model-facing schema. It deliberately does NOT reuse
 * `aiParseResponseSchema` from shared/: that is a root-level discriminated
 * union, and strict Structured Outputs require "the root level object of a
 * schema must be an object, and not use anyOf". Nested `anyOf` *is* allowed, so
 * the union hides under a single `result` key and is mapped onto the wire
 * contract in `toResult`.
 *
 * The numeric bounds are the shared ones, not re-typed literals, so they cannot
 * drift from the contract; `multipleOf(1)` keeps calories whole, since the UI
 * renders these raw and fractional kcal reads as false precision on an estimate.
 *
 * String LENGTHS are deliberately absent: strict mode's supported string
 * keywords are `pattern` and `format` only, so minLength/maxLength here would be
 * rejected. The prompt asks for a short name and the shared re-validation in
 * `toResult` is what actually enforces the bound.
 */
const wholeCaloriesSchema = caloriesSchema.multipleOf(1);

const modelItemSchema = z.object({
  name: z.string(),
  quantityDescription: z.string(),
  calories: wholeCaloriesSchema,
  proteinGrams: macroGramsSchema,
  carbsGrams: macroGramsSchema,
  fatGrams: macroGramsSchema,
});

const modelOutputSchema = z.object({
  result: z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('meal'),
      // Unbounded on purpose: strict mode rejects minLength/maxLength, so the
      // contract's bound is enforced by the re-validation in toResult.
      mealName: z.string(),
      items: z.array(modelItemSchema).min(1),
      // Spelled out rather than spreading macroTotalsSchema.shape: the spread
      // widens this branch to Record<string, unknown>, which costs the union its
      // narrowing and forces casts back into toResult.
      totalCalories: wholeCaloriesSchema,
      proteinGrams: macroGramsSchema,
      carbsGrams: macroGramsSchema,
      fatGrams: macroGramsSchema,
      confidenceNote: z.string(),
    }),
    z.object({
      kind: z.literal('notFood'),
      reason: z.string(),
    }),
  ]),
});

const SYSTEM_PROMPT = `You estimate the nutrition of a described meal.

Return kind "meal" when the description names food or drink, and kind "notFood"
when it does not, or when it is unintelligible. Never invent a meal from
gibberish — answer notFood instead.

For a meal:
- If no quantity is given, assume ONE TYPICAL SINGLE SERVING and say so in
  confidenceNote.
- The totals must equal the sum of the items.
- Calories are whole kcal; grams use at most one decimal place.
- confidenceNote is ONE short sentence naming the assumption you made.
- mealName is a short label, well under 200 characters.

Write mealName, confidenceNote and reason in the same language as the
description.`;

/**
 * Derived once at import. zodTextFormat walks the whole schema, rewrites it to
 * strict JSON Schema and builds a parser closure — all of it identical on every
 * request, so doing it per call would be pure event-loop tax.
 */
const MEAL_PARSE_FORMAT = zodTextFormat(modelOutputSchema, 'meal_parse');

type ParsedModelResponse = ParsedResponse<z.infer<typeof modelOutputSchema>>;

type ParseLogFields = {
  outcome: 'meal' | 'notFood' | 'failed';
  failureKind?: MealParseFailureKind;
  userId: string;
  inputTokens?: number;
  outputTokens?: number;
  openaiRequestId?: string;
};

/** Empty until a response exists, so failed requests log no token counts. */
function usageOf(response: ParsedModelResponse | undefined) {
  return response
    ? {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
        openaiRequestId: response.id,
      }
    : {};
}

/**
 * A refusal arrives as a content part inside an output message rather than a
 * top-level field, and it comes with `output_parsed: null` — so it has to be
 * checked before the decoding backstop, or every refusal would be logged as an
 * invalid output.
 */
function findRefusal(
  output: OpenAI.Responses.Response['output'],
): string | null {
  for (const item of output) {
    if (item.type !== 'message') continue;
    for (const part of item.content) {
      if (part.type === 'refusal') return part.refusal;
    }
  }
  return null;
}

export class OpenAiMealParser implements MealParser {
  /**
   * Metadata only, never the description or the model's output: a meal
   * description is dietary data about an identified user. Same instinct as the
   * capped client-IP logging in common/trust-proxy.ts.
   */
  private readonly logger = new Logger('MealParse');

  constructor(private readonly client: OpenAI) {}

  async parse(description: string, userId: string): Promise<AiParseResponse> {
    const startedAt = process.hrtime.bigint();
    // Undefined while the request is in flight, so a transport failure logs no
    // token counts rather than zeroes that would skew the cost view.
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

    // Mapped field by field rather than by spreading off the discriminant: it
    // keeps the narrowing (no cast), drops the model-only `kind`, and states the
    // correspondence to the contract outright — as toResponse does in
    // meals.controller.ts.
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

    // The model-facing schema is not the wire contract (see modelOutputSchema),
    // so the mapping is re-checked against the frozen schema before it ships.
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
        // OpenAI's abuse-detection field. Not part of the prompt.
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
