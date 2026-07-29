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
180 g"). Items illustrate the meal; they are never summed by the server. While
the user reviews a Parsed Meal the client may sum them as an editing aid, but
the moment the user sets a total by hand that total stands and the items are
illustration again — a stored Meal Entry whose items disagree with its totals
is the model working as intended, not a corrupt record.
_Avoid_: ingredient, product

**AI Parse**:
Turning a free-text description ("two eggs on toast") into a candidate meal. It
never writes: a parse yields either a Parsed Meal or the verdict "not food", and
both are successful recognitions — only a subsequent Meal Entry persists
anything. A parse that reaches neither outcome is a failure, not a verdict.
_Avoid_: analyse, scan, import

**Parsed Meal**:
What a successful AI Parse yields: a meal name, Meal Items, macro totals and a
Confidence Note. It is a proposal, not a record — it becomes a Meal Entry only
when the user confirms it (`source: ai`), and the user may adjust the totals
first. It carries no meal type; the user chooses that on confirmation.
_Avoid_: draft, suggestion, prediction

**Confidence Note**:
The one-sentence statement of the assumption behind a Parsed Meal's numbers —
typically the portion assumed when the description gave no quantity. It exists
because the numbers are estimates the user is asked to trust.
_Avoid_: disclaimer, warning

**Goal**:
A weight plan: start weight/date, target weight, and Pace. Direction (loss or
gain) comes from target vs. **start** weight, so it survives overshooting the
target; a Pace of 0 makes it a maintenance plan instead. At most one is active
per user. Creating a new Goal marks the previous active one `completed` when its
target had been reached and `replaced` when it hadn't — those are the only ways
the status ever changes. Statuses: `active`, `completed`, `replaced`.
_Avoid_: plan, target (alone)

**Pace**:
The Goal's chosen weekly weight-change rate (kg/week): 0 / 0.25 / 0.5 / 0.75 /
1.0, never above the 1.0 kg/week safety ceiling. The non-zero values are
magnitudes — direction belongs to the Goal, not the Pace — and imply the daily
calorie deficit or surplus (~7700 kcal per kg). A Pace of 0 is the single thing
that makes a Goal a maintenance plan: no destination, no deadline, Calorie
Target equal to Maintenance Calories. Moving a plan to or from maintenance is a
Pace change on the same Goal, not a new one.
_Avoid_: speed, rate, weekly change

**Target Reached**:
Current Weight has met or passed the active Goal's target, measured in that
Goal's own direction so an overshoot still counts. Derived on every read, never
stored, and always false on a maintenance plan — there is nothing to reach when
you are holding. It nulls the Projected Goal Date and holds the Calorie Target
at Maintenance Calories, so passing a loss target can never prescribe a surplus.
_Avoid_: goal achieved, completed (that is a Goal status, set only on replacement)

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
Pace, added to today. Derived on read from Current Weight. Null once Target
Reached, and always null on a maintenance plan — read it together with Target
Reached to tell those two apart.
_Avoid_: ETA, deadline

**Dashboard**:
The user's progress view for a single Tracking Day: calories eaten and
remaining against the Calorie Target with macro totals, plus Goal progress
(Current Weight vs. target, Projected Goal Date). A point-in-time read of one
day — the trend and history charts are assembled by the client from the Weight
Entry and Meal Entry journals, not part of the Dashboard itself.
_Avoid_: overview, home, summary
