# ADR-0014: A Saved Meal is its own record, and logging copies it

**Status**: Accepted
**Date**: 2026-08-04

## Context

The same meals recur — cottage cheese with honey, pasta bolognese — and each one
currently costs an AI Parse. ADR-0011 stored Nutrition Density alongside Portion
Weight and closed by noting that this made reusable meals possible but left them
"out of scope for this ticket". This is that follow-up.

The question the feature turns on is not storage but ownership: when a user logs
a kept meal at 400 g today instead of the 100 g they kept, and then next week
corrects a figure on the meal sitting in Monday's list, which record changed?

## Decision

A **Saved Meal** is its own aggregate in its own tables (`saved_meals`,
`saved_meal_items`), and **logging copies it**. There is no foreign key from
`meal_entries` to `saved_meals`, in either direction, and no column recording
that a meal came from one.

Three consequences, which are the whole point:

- Deleting a Saved Meal leaves every meal ever logged from it untouched.
- Editing a logged Meal Entry — the pencil on the dashboard or `/meals` — cannot
  reach the Saved Meal. It corrects that one meal.
- A Saved Meal changes only when edited directly, through its own controls.

Adjusting the weight or a figure while logging therefore affects only the meal
being logged. Writing those adjustments back to the template is a separate,
explicit action, not a side effect of logging.

A Saved Meal is a Meal Entry minus the **occasion**: no `mealType` and no
`recordedAt`. Both describe a moment rather than the food, and both are chosen on
logging — the same way a Parsed Meal carries no meal type. In the contract that
is literal: `createSavedMealRequestSchema` is `createMealRequestSchema.omit(…)`
of exactly those two, so `{ ...savedMeal, mealType, recordedAt }` **is** a valid
`CreateMealRequest` and logging is a spread rather than a mapping that can drift.

`source` stays `manual | ai`. It records how the kept figures were produced, and
logging copies it, so a meal logged from a parsed template still reads as `ai`.

## Alternatives considered

**A flag on `meal_entries`** — "favourite this meal", where logging duplicates
the row. Much less code, and rejected on two counts. Editing the template would
be editing a historical meal, silently changing a day the user had already
counted. And the template's lifetime would be the logged meal's: delete Monday's
pasta and the thing you saved goes with it.

**A foreign key from the logged meal back to its Saved Meal.** Coherent, and it
would allow "show me every time I ate this". Rejected because it makes the
template's figures load-bearing for history: either the FK is `ON DELETE
RESTRICT` and a template can never be deleted, or it nulls and the reference was
decoration. Meanwhile every read of a logged meal has to decide whether the
template's current numbers or the copied ones are true. Copying makes the meal
self-contained, which is what ADR-0008 already assumes of a stored meal.

**Items as a `jsonb` column** rather than a child table. Tempting: the server
never sums or queries items (ADR-0008) and a `PATCH` replaces the list whole, so
a child table's one advantage goes unused. Rejected to keep a single shape for a
Meal Item across the codebase — with two, a change to one is silent drift rather
than a migration.

## Consequences

**The column shapes are shared, the aggregates are not.** `meal_entries` and
`saved_meals` — and `meal_items` and `saved_meal_items` — take their common
columns from abstract bases in `backend/src/meal/meal-columns.ts`, which TypeORM
copies into each concrete table (no shared parent table, no discriminator). The
contract ⇄ columns translation is shared too, in `meal/meal-mapping.ts`: the
fan-out of one `per100g` into four columns, and the rule that collapses them back
only when all four are present, were the two places two hand-kept copies would
have quietly disagreed. Inheritance here is about the column shape only — a
SavedMeal is not a kind of MealEntry.

**Nothing reconciles a template with the meals logged from it.** A user who
corrects a density will see the new figure only on meals logged afterwards. That
is intended: the alternative rewrites days already counted.

**Duplicate names are allowed.** No unique index, so nothing to reconcile and no
409 to handle; the save control latches after it succeeds so a second press
cannot make a duplicate by accident.

**Per-item history stays unavailable.** Because nothing links a meal to its
template, "how often do I eat this" cannot be answered. ADR-0008 already flagged
that per-item analysis needs its own provenance; this decision does not add any.
