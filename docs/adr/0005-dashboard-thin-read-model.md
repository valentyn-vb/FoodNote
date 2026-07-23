# The dashboard is a thin single-day read model, not a chart-data aggregator

`GET /dashboard` returns one Tracking Day's numbers — calories eaten/remaining
against the Calorie Target with macro totals, and Goal progress (start / Current
/ target weight, Projected Goal Date). It deliberately does **not** return the
weight-trend series or the 7-day calorie series, even though ticket #33 ("weight
series for the trend chart, 7-day calorie series") and #34 ("charts read the
aggregate") are worded as if it should. The frozen contract (#26,
`shared/src/dashboard.ts`) already excludes them; this ADR records why, since the
ticket text says otherwise.

Reason: the chart series are presentation, not domain data. The weight-trend
chart plots weekly buckets (`6w ago … Now … +9w`) with a client-derived
projection line, and the calorie chart plots `Mon…Sun` buckets — bucketing,
labelling, and projection that would bake view concerns into the API. The raw
inputs already have homes: the append-only Weight Entry journal (`GET /weights`,
ADR-0004) and the Meal Entry list (`GET /meals`), both range-queryable. So the
client assembles the series from those (ticket #34), using the Dashboard's Goal
block for the projection endpoints. #33's stated "one endpoint instead of N
client queries" motivation still holds for the tiles; the charts cost two extra
indexed range fetches, not N. Embedding the series would instead fork the frozen,
co-owned contract and duplicate aggregation the resource endpoints already do.

Scope notes: `?date` scopes only the meal-totals window — Current Weight,
Maintenance Calories, Calorie Target and the Goal block always reflect present
state (they reuse the Profile/Goals read path). The endpoint 404s until
onboarding is complete (no Profile or no active Goal); an active Goal cannot
exist without a Weight Entry, so the calorie fields are always present once past
those two checks. Today's meal totals are read directly from `meal_entries`
until the Meals API (#32) lands a canonical aggregate to consolidate onto.
