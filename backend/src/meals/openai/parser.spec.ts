import { Logger } from '@nestjs/common';
import type OpenAI from 'openai';
import type { AiParseResponse } from '@foodnote/shared';
import { MealParseFailedError } from '../meal-parser';
import { OpenAiMealParser } from './parser';

/**
 * The seam is the OpenAI SDK: every test drives the adapter through a fake
 * `responses.parse`, so nothing here touches the network.
 */
const USER_ID = 'user-1';

function parseWith(
  parse: jest.Mock,
  description: string,
): Promise<AiParseResponse> {
  const adapter = new OpenAiMealParser({
    responses: { parse },
  } as unknown as OpenAI);
  return adapter.parse(description, USER_ID);
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
      portionGrams: 110,
      per100g: {
        calories: 130,
        proteinGrams: 11.8,
        carbsGrams: 0.9,
        fatGrams: 9.1,
      },
    },
    {
      name: 'Toast',
      quantityDescription: '1 slice',
      portionGrams: 30,
      per100g: {
        calories: 267,
        proteinGrams: 10,
        carbsGrams: 47,
        fatGrams: 3.3,
      },
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

    const result = await parseWith(parse, 'two eggs on toast');

    expect(result).toEqual({
      parsed: true,
      meal: {
        mealName: 'Two eggs on toast',
        items: [
          {
            name: 'Eggs',
            quantityDescription: '2 large',
            portionGrams: 110,
            per100g: {
              calories: 130,
              proteinGrams: 11.8,
              carbsGrams: 0.9,
              fatGrams: 9.1,
            },
          },
          {
            name: 'Toast',
            quantityDescription: '1 slice',
            portionGrams: 30,
            per100g: {
              calories: 267,
              proteinGrams: 10,
              carbsGrams: 47,
              fatGrams: 3.3,
            },
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

  it('issues the request with the pinned model and cost envelope', async () => {
    const parse = jest.fn().mockResolvedValue(completed(PARSED_MEAL));

    await parseWith(parse, 'two eggs on toast');

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

  // A description is dietary data about an identified user — metadata only.
  it('logs parse metadata without the description', async () => {
    const parse = jest.fn().mockResolvedValue(completed(PARSED_MEAL));
    const logged: string[] = [];
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation((message) => logged.push(String(message)));

    await parseWith(parse, 'two eggs on toast and a flat white');

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

    const result = await parseWith(parse, 'my bicycle');

    expect(result).toEqual({
      parsed: false,
      reason: 'That does not describe anything edible.',
    });
  });

  // Input-deterministic, so terminal: a retry is refused again (ADR-0006).
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
      parseWith(parse, 'something the model will refuse'),
    ).rejects.toMatchObject({ kind: 'refusal' });
  });

  // Also terminal: the fix is a bigger ceiling, not another attempt (ADR-0006).
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

      await expect(parseWith(parse, 'two eggs on toast')).rejects.toMatchObject(
        { kind },
      );
    },
  );

  // The SDK's retries are spent by here, and no APIError may escape the port.
  it('fails as transport when the SDK throws', async () => {
    const parse = jest.fn().mockRejectedValue(new Error('socket hang up'));

    await expect(parseWith(parse, 'two eggs on toast')).rejects.toMatchObject({
      kind: 'transport',
      name: 'MealParseFailedError',
    });
  });

  // An empty confidenceNote passes the model schema but not the contract.
  it('fails as invalidOutput when the mapped meal breaks the shared contract', async () => {
    const parse = jest
      .fn()
      .mockResolvedValue(completed({ ...PARSED_MEAL, confidenceNote: '' }));

    await expect(parseWith(parse, 'two eggs on toast')).rejects.toMatchObject({
      kind: 'invalidOutput',
    });
  });

  // A backstop: `output_parsed` is nullable, and a crash here would be a 500.
  it('fails as invalidOutput when the model output could not be parsed', async () => {
    const parse = jest.fn().mockResolvedValue({
      ...completed(PARSED_MEAL),
      output_parsed: null,
    });

    await expect(parseWith(parse, 'two eggs on toast')).rejects.toThrow(
      MealParseFailedError,
    );
  });
});
