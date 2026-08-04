import type { AiParseResponse } from '@foodnote/shared';
import { MealParser } from './meal-parser';

/**
 * A deterministic AI Parse for the end-to-end suite.
 *
 * The meal drawer is AI-first — description in, preview out, save — so a suite
 * that skipped the parse would skip the path most users take. Real OpenAI calls
 * are out of the question in CI (cost, non-determinism, a key in the secrets),
 * and browser-level interception of `/api/meals/ai-parse` is a dead end: once
 * the frontend stops calling Nest directly there is no request left to catch.
 *
 * `MealParser` is a port (ADR-0006) and `createTestApp` already swaps it for
 * exactly this reason. This extends that seam to a process launched from the
 * outside. It is test infrastructure, not a frontend workaround — the map's rule
 * about touching Nest is not being widened here.
 *
 * The two branches mirror the real contract: an unrecognised description is a
 * *successful* parse reporting `parsed: false` (ADR-0006), not an error.
 */
export class StubMealParser extends MealParser {
  parse(description: string): Promise<AiParseResponse> {
    if (/\bnot ?food\b/i.test(description)) {
      return Promise.resolve({
        parsed: false,
        reason: "That doesn't look like something you ate.",
      });
    }

    return Promise.resolve({
      parsed: true,
      meal: {
        mealName: 'Stubbed parse',
        totalCalories: 420,
        proteinGrams: 24,
        carbsGrams: 34,
        fatGrams: 20,
        items: [
          {
            name: description.slice(0, 200),
            quantityDescription: '1 serving',
            portionGrams: 100,
            per100g: {
              calories: 420,
              proteinGrams: 24,
              carbsGrams: 34,
              fatGrams: 20,
            },
          },
        ],
        confidenceNote: 'Fixed values from the test parser.',
      },
    });
  }
}
