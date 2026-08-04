# ADR-0011: Nutrition is stored as per-100 g density plus portion weight

**Status**: Accepted
**Date**: 2026-08-04

## Context

The AI parser returns a portion estimate alongside calorie and macro figures.
Until this change, only the absolute per-portion figures were stored: a parsed
100 g of rice (131 kcal) recorded as 131 kcal, no weight. If the user ate 150 g
they had to manually correct all four figures against numbers the model had
already computed internally.

Two things made storing only the portion inadequate:

1. **No editability without arithmetic.** The user cannot simply change the
   weight — there is nothing to scale. Every correction is four arithmetic
   operations against a model guess the user may not have seen.

2. **No reusability.** A stored meal entry cannot answer "how many kcal if I ate
   200 g of that chicken?" because the density was never kept — only what was
   eaten at one specific weight was recorded.

## Decision

Each Meal Item stores **Nutrition Density** (`per100g`: calories and macros
per 100 g of the food) and **Portion Weight** (`portionGrams`: grams eaten).
The per-portion figures are derived at read time: `per100g × portionGrams / 100`.

Both fields are nullable together: a hand-added item (no AI parse) has no
density estimate, so both stay null and the four per-portion figures are typed
directly by the user. The model schema (`modelItemSchema`) makes both required,
enforcing that the parser always estimates a weight.

The two derivations are pure functions in `shared/src/calc.ts` — `perPortion`
and `densityFrom` — so frontend and backend compute the same numbers.

## Consequences

**Dashboard and totals are unchanged.** `meal_entries` still stores absolute
totals (`totalCalories`, `proteinGrams`, `carbsGrams`, `fatGrams`). Items are
illustration (ADR-0008) and the server never reconciles them with the entry
totals. This decision only changes what goes into `meal_items`.

**Portion editing becomes one input.** Changing the weight recomputes all four
figures from the stored density; editing a figure back-calculates the implied
density so it updates consistently.

**Existing rows are migrated as 100 g portions.** The migration
(`MealItemsPerPortion1785400000000`) treats the old absolute figures as per-100 g
densities with a 100 g portion, preserving every logged figure exactly: items
are illustration (ADR-0008), not a precise food database, so this is adequate.

**The model prompt changes, the totals constraint is preserved.** The prompt
asks for `portionGrams` and `per100g` per item, and the totals constraint is
restated: `totalCalories = sum(portionGrams_i × per100g.calories_i / 100)`.
Per-portion figures are intentionally not requested from the model — giving it
three things to keep consistent (per-100 g, per-portion, and totals) is worse
than letting the client derive one from the other two.

**Saved meals and reusable products are out of scope for this ticket.** This ADR
establishes the data shape they require; the product features follow separately.
