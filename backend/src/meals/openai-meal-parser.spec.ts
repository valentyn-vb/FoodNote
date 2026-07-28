import { Logger } from '@nestjs/common';
import type OpenAI from 'openai';
import { MealParseFailedError } from './meal-parser';
import { OpenAiMealParser } from './openai-meal-parser';

/**
 * The seam is the OpenAI SDK: every test drives the adapter through a fake
 * `responses.parse`, so the prompt, the mapping onto the frozen contract and
 * the failure taxonomy are all covered without a network call.
 */
type FakeParse = jest.Mock;

const USER_ID = 'user-1';

/** Binds the caller's id so each test reads as one description in, one out. */
function makeParser(parse: FakeParse): {
  parse: (d: string) => Promise<unknown>;
} {
  const adapter = new OpenAiMealParser({
    responses: { parse },
  } as unknown as OpenAI);
  return { parse: (description) => adapter.parse(description, USER_ID) };
}

/** A completed response carrying the model-facing `result` union. */
function completed(result: unknown) {
  return {
    id: 'resp_1',
    status: 'completed',
    incomplete_details: null,
    output: [],
    output_parsed: { result },
    usage: { input_tokens: 300, output_tokens: 120 },
  };
}

const PARSED_MEAL = {
  kind: 'meal',
  mealName: 'Two eggs on toast',
  items: [
    {
      name: 'Eggs',
      quantityDescription: '2 large',
      calories: 143,
      proteinGrams: 13,
      carbsGrams: 1,
      fatGrams: 10,
    },
    {
      name: 'Toast',
      quantityDescription: '1 slice',
      calories: 80,
      proteinGrams: 3,
      carbsGrams: 14,
      fatGrams: 1,
    },
  ],
  totalCalories: 223,
  proteinGrams: 16,
  carbsGrams: 15,
  fatGrams: 11,
  confidenceNote: 'Assumed one slice of toast and no added butter.',
};

describe('OpenAiMealParser', () => {
  it('maps a recognised meal onto the contract as parsed: true', async () => {
    const parse = jest.fn().mockResolvedValue(completed(PARSED_MEAL));

    const result = await makeParser(parse).parse('two eggs on toast');

    expect(result).toEqual({
      parsed: true,
      meal: {
        mealName: 'Two eggs on toast',
        items: [
          {
            name: 'Eggs',
            quantityDescription: '2 large',
            calories: 143,
            proteinGrams: 13,
            carbsGrams: 1,
            fatGrams: 10,
          },
          {
            name: 'Toast',
            quantityDescription: '1 slice',
            calories: 80,
            proteinGrams: 3,
            carbsGrams: 14,
            fatGrams: 1,
          },
        ],
        totalCalories: 223,
        proteinGrams: 16,
        carbsGrams: 15,
        fatGrams: 11,
        confidenceNote: 'Assumed one slice of toast and no added butter.',
      },
    });
  });

  // Pins the cost/latency envelope: a generous token ceiling (truncation is
  // terminal, so it must not happen), the cheapest reasoning tier, and the
  // pinned model the prompt was written against.
  it('issues the request with the pinned model and cost envelope', async () => {
    const parse = jest.fn().mockResolvedValue(completed(PARSED_MEAL));

    await makeParser(parse).parse('two eggs on toast');

    expect(parse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-5-mini',
        max_output_tokens: 2000,
        // The floor gpt-5-mini accepts; 'none' is rejected outright.
        reasoning: { effort: 'minimal' },
        safety_identifier: USER_ID,
      }),
    );
    const [body] = parse.mock.calls[0] as [{ input: { content: string }[] }];
    expect(body.input[1].content).toBe('two eggs on toast');
  });

  // Meal descriptions are dietary data about an identified user, so the cost log
  // carries metadata only. This test is the guarantee, not a nicety.
  it('logs parse metadata without the description', async () => {
    const parse = jest.fn().mockResolvedValue(completed(PARSED_MEAL));
    const logged: string[] = [];
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation((message) => logged.push(String(message)));

    await makeParser(parse).parse('two eggs on toast and a flat white');

    expect(log).toHaveBeenCalled();
    const line = logged.join(' ');
    expect(line).not.toContain('flat white');
    expect(line).not.toContain('Two eggs on toast');
    expect(JSON.parse(logged[0])).toMatchObject({
      outcome: 'meal',
      model: 'gpt-5-mini',
      userId: USER_ID,
      inputTokens: 300,
      outputTokens: 120,
      openaiRequestId: 'resp_1',
    });
    log.mockRestore();
  });

  // "Not food" is a successful recognition, not an error — see ADR-0006.
  it('maps a notFood verdict onto the contract as parsed: false', async () => {
    const parse = jest.fn().mockResolvedValue(
      completed({
        kind: 'notFood',
        reason: 'That does not describe anything edible.',
      }),
    );

    const result = await makeParser(parse).parse('my bicycle');

    expect(result).toEqual({
      parsed: false,
      reason: 'That does not describe anything edible.',
    });
  });

  // A safety refusal is input-deterministic, so it is terminal: retrying would
  // be refused again for double the money (ADR-0006). It needs its own kind so
  // the logs can tell it apart from a decoding failure.
  it('fails as refusal when the model refuses', async () => {
    const parse = jest.fn().mockResolvedValue({
      id: 'resp_1',
      status: 'completed',
      incomplete_details: null,
      output: [
        {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'refusal', refusal: 'I cannot help with that.' }],
        },
      ],
      output_parsed: null,
      usage: { input_tokens: 300, output_tokens: 12 },
    });

    await expect(
      makeParser(parse).parse('something the model will refuse'),
    ).rejects.toMatchObject({ kind: 'refusal' });
  });

  // Truncation recurs identically at the same max_output_tokens, so it is
  // terminal too — the fix is a bigger ceiling, not another attempt (ADR-0006).
  it.each([
    ['max_output_tokens', 'truncated'],
    ['content_filter', 'contentFilter'],
  ])(
    'fails as %s -> %s when the response is incomplete',
    async (reason, kind) => {
      const parse = jest.fn().mockResolvedValue({
        id: 'resp_1',
        status: 'incomplete',
        incomplete_details: { reason },
        output: [],
        output_parsed: null,
        usage: { input_tokens: 300, output_tokens: 2000 },
      });

      await expect(
        makeParser(parse).parse('two eggs on toast'),
      ).rejects.toMatchObject({ kind });
    },
  );

  // The SDK already retried connection errors, 429s and 5xx below this seam, so
  // reaching here means it gave up. The raw APIError must not escape the port —
  // callers only know MealParseFailedError.
  it('fails as transport when the SDK throws', async () => {
    const parse = jest.fn().mockRejectedValue(new Error('socket hang up'));

    await expect(
      makeParser(parse).parse('two eggs on toast'),
    ).rejects.toMatchObject({
      kind: 'transport',
      name: 'MealParseFailedError',
    });
  });

  // The model-facing schema and the wire contract are separate (the wire union
  // cannot be a strict output schema), so the mapped result is re-validated
  // against shared/ before it leaves. An empty confidenceNote satisfies the
  // model schema but not the contract.
  it('fails as invalidOutput when the mapped meal breaks the shared contract', async () => {
    const parse = jest
      .fn()
      .mockResolvedValue(completed({ ...PARSED_MEAL, confidenceNote: '' }));

    await expect(
      makeParser(parse).parse('two eggs on toast'),
    ).rejects.toMatchObject({ kind: 'invalidOutput' });
  });

  // Strict decoding makes this near-impossible, so it is a backstop rather than
  // the primary guard — but `output_parsed` is typed nullable and a silent
  // crash here would surface as a 500, not the contract's 502.
  it('fails as invalidOutput when the model output could not be parsed', async () => {
    const parse = jest.fn().mockResolvedValue({
      ...completed(PARSED_MEAL),
      output_parsed: null,
    });

    await expect(makeParser(parse).parse('two eggs on toast')).rejects.toThrow(
      MealParseFailedError,
    );
  });
});
