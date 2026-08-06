# Onboarding step 3: review before commit

The wizard writes on "Confirm plan" and lands on the dashboard, so the last
thing a new user sees of what they typed is the form they typed it into. This
adds a third step that shows the details and the chosen plan as text, and moves
the write behind it.

## Where the write happens

On step 3, not step 2. Until "Proceed to dashboard" is pressed nothing exists
server-side, so every Back is honest and a user who closes the tab has created
nothing. `createPlan` is unchanged — still the one transaction of ADR 0016,
still redirecting on success.

Step 2's button therefore stops saying "Confirm plan": `PlanSelection` takes an
optional `confirmLabel`, and onboarding passes "Review". `/profile`'s
Change-plan dialog and the goal-reached overlay pass nothing and keep the
current label — for them the button really does confirm. Step 2 also stops
passing `submitting` / `submitError`: there is no write there to report.

## The screen

The card skeleton of steps 1 and 2 — "Step 3 of 3", a title, a description that
says nothing is saved yet — with two blocks.

**Your plan.** The chosen option in the shape the plate had it: the pace line, the
calorie target as the figure, the projected goal date. Computed here from
`calorieTargetForPace()` and `projectedDate()` in `shared/` — the same functions
the manual-plan form already derives its preview with. The plan picker keeps
handing up a `Pace` and nothing else, so no shared component changes shape for
this screen.

Maintenance (pace 0) reads as it does on the plate: "Maintain your weight" and
"Holds your current weight", with no goal date — `formatGoalDate(null)` would
print "Target already reached" on a plan just being started.

**Your details.** A `dl` of Sex, Age, Height, Current weight, Target weight,
Activity level. The same rows `/profile` shows, plus current weight, which
`/profile` has no row for and which the user has just entered here.

The footer is the disclaimer and `[Back] … [Proceed to dashboard]`. The spinner
and the save error live here now, because this is where the write is.

## Navigation

Back only — to the plan step, and from there back to the details. No per-block
Edit: two steps back is not the depth that earns a second navigation model, and
per-block Edit immediately raises "where does Continue return to", which is a
question this screen does not need to answer.

## State

`step: 'details' | 'plan' | 'review'` and `pace: Pace | null` in the wizard.

The plan's start date is fixed **once**, when the wizard mounts, and passed to
both `PlanSelection` and the review step. Derived independently in two places it
would differ across midnight, and the goal date confirmed would not be the goal
date chosen.

With no `pace` the review step does not render and the wizard falls back to the
plan step — the state is unreachable through the UI, and this keeps a hot reload
from painting a screen with a hole in it.

## Files

- `app/(onboarding)/onboarding/review-step.tsx` — new; presentational, taking the
  form values, the pace, the start date, `submitting` / `submitError`, `onBack`
  and `onConfirm`.
- `components/detail-row.tsx` — new; the `dt`/`dd` row lifted out of
  `personal-details-section.tsx`. Two call sites with one look is a component,
  not a copied class string.
- `app/(onboarding)/onboarding/onboarding-wizard.tsx` — the third step, the pace
  state, the fixed start date.
- `components/onboarding/plan-selection.tsx` — `confirmLabel`.
- `app/(app)/profile/personal-details-section.tsx` — imports `DetailRow` instead
  of declaring it.

## Verification

Typecheck, `npm run lint`, `npm run format:check`, the unit suites, and the
screen at 360, 390, 768, 1024 and 1440 in both appearances.

No e2e scenario for walking the wizard, deliberately: the smoke net keeps the
`fresh` account not-onboarded, and `access.spec.ts` asserts that it is redirected
to `/onboarding`. Completing the wizard would spend that fixture and break the
neighbouring spec. Covering onboarding end to end needs a per-scenario throwaway
account, which is its own piece of work.
