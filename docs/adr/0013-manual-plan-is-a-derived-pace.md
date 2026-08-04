# A manual plan is a derived Pace, not a stored calorie number

A user who picks 0.5 kg/week, diets for a few weeks and finds the scale moving
slower than that has one lever today: the Pace picker. Stepping 0.5 → 0.75 is a
275 kcal/day jump and re-declares the whole plan. What they want is to name their
own calories.

## The rejected shape: a stored Calorie Adjustment

The obvious design is a signed kcal correction on the Goal —
`calorieAdjustment: int NOT NULL DEFAULT 0` — applied on top of the pace deficit.
It was built far enough to see what it costs, then thrown away. Recorded here
because it is the design anyone will reach for again.

It needs a column and a migration, a new field on the goal response, a mirror on
the profile response, a third parameter on `calorieTargetForPace`, and a
safety-floor check on the write path that `GoalsService` cannot perform without
reaching for the profile row (injecting `ProfileService` is a cycle —
`ProfileModule` imports `GoalsModule`). Then the questions start, and none of
them have a clean answer:

- Does a Pace change clear the adjustment? Clearing destroys a number the user
  typed as a side effect of a different action. Keeping it means a plan card
  reading "1,850 kcal / day" lands the user on 1,750, because `buildPlanOptions`
  knows nothing about the adjustment.
- Keeping it also strands the adjustment: pace 0.25 with −100 clears the floor,
  patching to 0.5 does not, and the target silently holds at 1,200 with the
  correction doing nothing and no write to catch it.
- The Projected Goal Date comes off the nominal Pace, so it describes a rate the
  user is deliberately not eating for.

Every one of those is a consequence of the same mistake: **two numbers now
decide the Calorie Target, and they can disagree.**

## The decision

A manual plan names calories; the Pace is **derived** from them and stored in the
field that already exists.

```
user types 1,750 kcal/day
  maintenance 2,400  ->  deficit 650/day  ->  650 x 7 / 7700 = 0.5909 kg/week
  goals.preferredWeeklyChangeKg = 0.5909      (displayed as 0.59)
```

`paceForCalorieTarget` in `shared/src/calc.ts` is the inverse of
`calorieTargetForPace`, and it is the whole feature. One number still decides the
Calorie Target, so there is nothing to disagree with:

- **Calorie Target** recomputes from Maintenance Calories and the stored rate, so
  the plan follows the user's weight down on its own. At 85 kg the same 0.59
  serves fewer calories than at 90 kg. No new logic — this is what
  recomputed-on-every-read already did.
- **Projected Goal Date** is `remaining ÷ 0.59`, honest by construction: it is
  derived from the same rate the calories imply.
- **Target Reached**, the Safety Floor clamp, and the maintenance/gain branches
  are untouched.

The cost is one contract change: `paceSchema` widens from
`z.literal([0, 0.25, 0.5, 0.75, 1.0])` to `z.number().min(0).max(MAX_SAFE_PACE_KG)`.

**This amends ADR-0002**, which re-froze the pace set. The presets survive as
`PACE_OPTIONS` — now an explicit array, since `paceSchema.values` no longer
exists — and they are still the only rates the picker _proposes_. What changes is
that presets stop being the _domain_ of Pace and become a shortcut within it.
ADR-0002's actual reasoning is untouched: 1.0 is still the ceiling, still the top
preset, and still the value that makes the Safety Floor bind on real bodies.

A rate carries four decimals rather than two, for a reason that is about calories
rather than about Pace — see below.

`MAX_SAFE_PACE_KG` moved from `calc.ts` to `goals.ts` in the process. It is a
property of the value, not of the arithmetic, and `paceSchema` needs it as a
bound — `calc.ts` already imports from `goals.ts`, so there is no cycle. It is
still re-exported from the package root, so no consumer changed.

## What this buys, concretely

No new column. No new contract field. No new endpoint — the client derives the
rate with the shared calc (which is exactly what ADR-0001 exists for) and sends it
through the `POST /goals` and `PATCH /goals/current` that already take a Pace. The
backend needed no source change beyond one column's precision.

## Why the Pace column carries four decimals

The first cut reused `numeric(4,2)` as it stood and called the rounding a
negligible error budget. That was wrong, and it showed up immediately: a user who
typed 1,600 was served 1,596.

One step of Pace is worth `step × 7700 ÷ 7` kcal/day. At two decimals that step is
**11 kcal**, so the achievable calorie targets sat on an 11 kcal grid and a typed
budget landed up to 5.5 kcal away from itself. The number the user chose was not
the number the app served, which is the one property a manual plan has to have.

`numeric(6,4)` puts the step at 0.11 kcal — inside the ±0.5 that whole-kcal
rounding absorbs — so `calorieTargetForPace(paceForCalorieTarget(budget))` returns
the budget exactly, and `paceForCalorieTarget` rounds to the same four decimals so
the previewed rate is the stored one. `calc.spec.ts` asserts the round trip over a
spread of budgets rather than a tolerance, because a tolerance is what hid this.

The migration is a widening: every stored preset is representable unchanged and
the integer part stays two digits, so no row needs a backfill.

## Where it lives

`ManualPlanDialog` is a sibling of the preset cards inside `PlanSelection`, not
one of them, so onboarding, Settings → Change plan and the goal-reached overlay
all get it from one place. It owns its own form state and derived preview, and
saves through the same `onConfirm(pace)` callback a preset card does — the three
call sites did not change.

Re-opening the picker on a manual plan is where the first cut went wrong, twice,
and both mistakes had the same root: a derived rate matches no preset card, so the
picker had nothing to select. Substituting the default preset made the cards
misreport the user's pace _and_ their calories, and threading a second "start
from" rate to the dialog only papered over the display while leaving the visible
screen wrong.

The fix is that **the plan the user is on is one of the options.**
`buildPlanOptions` takes a `currentPace` and always gives it a card — sorted in
among the presets, exempt from the floor's hide rule, a full option with its own
calories and projected date. It then arrives selected like anything else, and
`PlanSelection` needs no substitute pace and no second rate: `selectedPace` is
just `pickedPace ?? initialPace ?? default`, as it was before any of this.

The one thing that still asks whether the plan is custom is the dialog's wording —
"Edit your custom plan" rather than "Create your own plan", so it does not read as
if the current plan is about to be discarded.

Being a sibling also matters at the dead end: when the Safety Floor hides every
loss preset, "no safe plan reaches this target" used to be the end of the
conversation. Naming a slower budget by hand is now the way through, and it is
still bounded by the floor.

## The bounds

`manualCalorieRange` returns what a manual plan may name, in the goal's own
direction: never below the Safety Floor, never further from Maintenance Calories
than the safety ceiling allows, never past maintenance on the wrong side. It is
shared so the form's field error and the read path agree — the point is that a
user can never ask for a number the clamp would silently overrule.

Eating on the wrong side of maintenance for the goal's direction derives a rate
of 0, and pace 0 is already a maintenance plan with no Projected Goal Date
(ADR-0006). The honest answer to "these calories will not move you toward your
target" therefore needed no new branch anywhere.

---

_On the number: 0007 and 0008 are deliberately skipped here. The unmerged #39
branch renumbers the pace-zero ADR to 0007 (resolving the duplicate 0006 on
`main`) and adds 0008, so taking either would collide on merge. Once #39 lands,
the pace-zero references in this file and in `shared/src/goals.ts` point at 0007._
