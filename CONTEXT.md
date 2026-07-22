# FoodNote

Weight-loss planning and calorie tracking with AI-assisted meal logging. One
bounded context: a single user plans a goal, logs weight and meals, and tracks
progress on a dashboard.

## Language

**Weight Entry**:
A record of the user's body weight (kg) at a moment in time (`recordedAt`).
The weight journal is an append-only list — any number of entries per day —
and is the only place weight is ever written. An entry is corrected or removed
individually by id (`PATCH`/`DELETE /weights/:id`), never upserted.
_Avoid_: weigh-in, measurement

**Tracking Day**:
The UTC calendar day derived from a record's `recordedAt`. Daily boundaries —
dashboard totals, the `from`/`to` range bounds on the weight journal — use it;
the API never deals in client timezones (accepted MVP trade-off). It does not
govern weight uniqueness: the journal allows any number of entries per day.
_Avoid_: local day, date (as a field concept)

**Current Weight**:
The weight (kg) of the user's most recent Weight Entry. Always derived, never
stored or edited on its own — onboarding weight simply creates the first entry.
_Avoid_: profile weight

**Meal Entry**:
One logged meal with its own macro totals (kcal, protein/carbs/fat grams) —
the totals are the source of truth, whether typed by hand (`source: manual`)
or confirmed from an AI parse (`source: ai`).
_Avoid_: food log, entry (alone)

**Meal Item**:
An optional line inside a Meal Entry detailing one food ("Chicken breast,
180 g"). Items illustrate the meal; they are never summed by the server.
_Avoid_: ingredient, product

**Goal**:
A weight plan: start weight/date, target weight, and Pace. Direction (loss or
gain) is implied by target vs. Current Weight; target == current is
maintenance. At most one is active per user; creating a new Goal marks the
previous active one `replaced`. Statuses: `active`, `completed`, `replaced`.
_Avoid_: plan, target (alone)

**Pace**:
The Goal's chosen weekly weight-change rate (kg/week) — always a positive
magnitude (0.25 / 0.5 / 0.75 / 1.0), never above the 1.0 kg/week safety
ceiling. Implies the daily calorie deficit or surplus (~7700 kcal per kg).
_Avoid_: speed, rate, weekly change

**Maintenance Calories**:
The daily energy (kcal) that keeps Current Weight unchanged: BMR
(Mifflin-St Jeor) × activity factor. Recomputed on every read, never stored.
_Avoid_: TDEE (in user-facing text), baseline

**Calorie Target**:
The daily kcal budget from the active Goal: Maintenance Calories minus the
deficit (loss), plus the surplus (gain), or unchanged (maintenance). On the
loss side only, clamped up to the Safety Floor. Recomputed on every read,
never stored or edited directly.
_Avoid_: daily goal, calorie limit

**Safety Floor**:
The lowest Calorie Target ever offered — 1200 kcal (female) / 1500 kcal
(male). A loss-side concept only; it never affects gain or maintenance.
_Avoid_: minimum, lower bound

**Plan Option**:
One viable plan for a given Pace, shown during onboarding before a Goal
exists: its Calorie Target, daily deficit/surplus, and Projected Goal Date.
An option whose unclamped loss target falls below the Safety Floor is hidden
(omitted entirely), not shown disabled.
_Avoid_: plan choice, tier

**Sex**:
Biological sex (`male` | `female`) — the input the BMR formula and the
calorie safety floor require. Not gender identity; UI copy may clarify, the
field name does not change.
_Avoid_: gender

**Activity Level**:
The user's habitual movement bucket, mapping to a TDEE multiplier on the
standard Mifflin-St Jeor scale: sedentary 1.2, light 1.375, moderate 1.55,
active 1.725, very active 1.9.
_Avoid_: exercise level, lifestyle

**Projected Goal Date**:
The date the active Goal should be reached at its Pace: remaining weight ÷
Pace, added to today. Derived on read from Current Weight.
_Avoid_: ETA, deadline
