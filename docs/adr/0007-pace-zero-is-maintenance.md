# A Pace of 0 is maintenance, and reaching a target is derived, not stored

Two questions kept answering themselves differently, so this ADR fixes one
source of truth for each.

## Maintenance is Pace 0, not `target == current`

The contract shipped with two ways to say "maintain". `CONTEXT.md` defined it as
`targetWeightKg == currentWeightKg`, and `calorieTargetForPace` implemented that
reading (equal weights → plain maintenance). But Current Weight moves every time
a weight is logged, so under that definition a plan drifted in and out of being
a maintenance plan on its own — and it was unreachable in the UI anyway, because
`buildPlanOptions` returned four identical cards for it (same kcal, same null
date, differing only in a `dailyEnergyDelta` nothing rendered).

**Pace is now the only thing that says what kind of plan a Goal is.** `0` joined
`paceSchema`, so a Goal is maintenance when, and only when, its
`preferredWeeklyChangeKg` is `0`. `targetWeightKg` is then simply ignored,
deliberately left parked rather than rewritten.

This was chosen because it costs almost nothing. `paceSchema` is the single
source for `PACE_OPTIONS`, the goal request/response, `PlanOption` and
`ProfileResponse`, so `0` propagates to every one of them for free; a
"Maintain your weight" card appears in both plan surfaces (onboarding and
Settings → Change plan) with no new component and no new call site; and
`dailyEnergyDeltaForPace(0)` already returned `0`, so `calorieTargetForPace`
yields plain maintenance with **no new branch**. ADR-0002 is the precedent for
amending the frozen pace set; this is the same kind of forward amendment.

Two consequences worth stating:

- **Switching to or from maintenance is a `PATCH`, not a `POST`.** Pace is
  exactly what `PATCH /goals/current` owns (ADR-0003), so flipping to
  maintenance and back is one field on one row — no new Goal, no reset baseline,
  and no history noise however often the user changes their mind. Because the
  target stays parked, patching a real pace back resumes the same diet.
- **`projectedDate` must guard `weeklyPaceKg <= 0` first.** Dividing by zero
  gives `Infinity` days, `setUTCDate(Infinity)` gives an Invalid Date, and
  `toISOString()` throws `RangeError` — so without the guard every maintenance
  goal 500s on read. The guard is load-bearing, not defensive.

The one accepted wart: a user can still type `targetWeightKg == currentWeightKg`
and pick a non-zero pace, which shows four cards with identical calories. The
Maintain card makes that unlikely and it is harmless, so it is not coded around.

## Reaching a target is derived, and never changes the status

`goalStatusSchema` had reserved `completed` since the contract was written and
nothing ever set it. It is now set in exactly one place: `POST /goals` marks the
outgoing active goal `completed` if its target had been reached and `replaced` if
it hadn't. So the `completed` set is a clean list of real achievements, and a
reached goal keeps its own target in history instead of having it overwritten.

**Reaching a target must not touch the status.** `GET /goals/current` 404 is the
contract's "onboarding not complete" signal, `useOnboardingStatus` maps that 404
to `not-onboarded`, and `OnboardingGuard` redirects there — so flipping the
active goal to `completed` on arrival would eject the user into the onboarding
wizard at the exact moment they succeeded. The goal stays `active`;
`reachedTarget` is derived on read, joining Current Weight, Maintenance
Calories, Calorie Target and Projected Goal Date as recomputed-every-time.

`hasReachedTarget` takes direction from **start vs target**, not current vs
target. That is the whole point: `projectedDate` works on a magnitude
(`Math.abs`), so once the user overshoots, the stored target sits on the far side
of Current Weight and a current-weight comparison reads a passed loss goal as a
gain goal still to come. Two user-visible bugs came from exactly that, and both
are fixed here — the dashboard counted down "weeks left" to a weight already
passed, and `calorieTargetForPace` read target > current as a gain plan and
returned maintenance **plus a surplus**, telling someone who had just hit their
goal to eat more. The profile read path now feeds Current Weight as the target
whenever the goal is reached, so a met goal lands on maintenance.

Detection lives on the goal read path rather than the weight write path for a
structural reason as well as a conceptual one: `GoalsModule` already imports
`WeightsModule`, so `WeightsService → GoalsService` would be circular. The goal
read is where Current Weight and the target already meet.

Because `projectedGoalDate` is now null for both a reached goal and a
maintenance plan, clients read the pair: `null && reachedTarget` is reached,
`null && !reachedTarget` is maintaining, and a live diet always has a date. The
dashboard's goal block carries `reachedTarget` for that reason.

## Celebration needs no persistence

The goal-reached overlay fires on the transition, not the state: the client
already holds the pre-save goal block, so `false → true` across a weight save is
the event. That makes it fire once — logging again while still at target sees
`reachedTarget` already true — and it means nothing has to be stored to remember
whether the user was congratulated. No `completedAt` column, no client flag.
