# FoodNote

Weight-loss planning and calorie tracking with AI-assisted meal logging. One
bounded context: a single user plans a goal, logs weight and meals, and tracks
progress on a dashboard.

## Language

**Weight Entry**:
A record of the user's body weight (kg) at a moment in time (`recordedAt`);
at most one per Tracking Day. The weight journal is the only place weight is
ever written.
_Avoid_: weigh-in, measurement

**Tracking Day**:
The UTC calendar day derived from a record's `recordedAt`. All daily
boundaries — weight uniqueness, dashboard totals — use it; the API never
deals in client timezones (accepted MVP trade-off).
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
A weight-loss plan: start weight/date, target weight, and Pace. At most one
is active per user; creating a new Goal marks the previous active one
`replaced`. Statuses: `active`, `completed`, `replaced`.
_Avoid_: plan, target (alone)

**Pace**:
The Goal's chosen weekly weight-loss rate (kg/week), which implies the daily
calorie deficit (~7700 kcal per kg).
_Avoid_: speed, rate, weekly change

**Maintenance Calories**:
The daily energy (kcal) that keeps Current Weight unchanged: BMR
(Mifflin-St Jeor) × activity factor. Recomputed on every read, never stored.
_Avoid_: TDEE (in user-facing text), baseline

**Calorie Target**:
The daily kcal budget: Maintenance Calories minus the deficit implied by the
active Goal's pace, clamped to the safety floor (1200 kcal women / 1500 men).
Recomputed on every read, never stored or edited directly.
_Avoid_: daily goal, calorie limit

**Sex**:
Biological sex (`male` | `female`) — the input the BMR formula and the
calorie safety floor require. Not gender identity; UI copy may clarify, the
field name does not change.
_Avoid_: gender

**Activity Level**:
The user's habitual movement bucket, mapping to a TDEE multiplier
(sedentary 1.2 … very active 1.725).
_Avoid_: exercise level, lifestyle

**Projected Goal Date**:
The date the active Goal should be reached at its Pace: remaining weight ÷
Pace, added to today. Derived on read from Current Weight.
_Avoid_: ETA, deadline
