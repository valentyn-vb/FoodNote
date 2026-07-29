/** Pinned, not configurable: the prompt and the model are a matched pair. */
export const MEAL_PARSE_MODEL = 'gpt-5-mini';

/**
 * Loose on purpose: reasoning tokens count against this and truncation is
 * terminal (ADR-0006), so it must not be reachable.
 */
export const MAX_OUTPUT_TOKENS = 2000;

/** The floor this model accepts — gpt-5-mini rejects 'none' outright. */
export const REASONING_EFFORT = 'minimal';

export const SYSTEM_PROMPT = `You estimate the nutrition of a described meal.

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
