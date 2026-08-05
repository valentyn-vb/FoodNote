# Onboarding, on the app's own look

The two-step onboarding wizard is the last screen drawn to its own rules: a bare
column on the page background, its own spacing scale, and headings in a face and
size no other screen uses. This spec brings it onto the language of `(auth)` —
the screens a user has just come from — without touching what the flow does.

Nothing here changes behaviour: the same two steps, the same one transaction on
confirm (ADR 0016), the same gate in `requireNotOnboarded()`.

## What diverges today

- `(onboarding)/layout.tsx` is `<main className="min-h-screen">` — no surface, no
  mascot, no wordmark, while `(auth)/layout.tsx` centres a `MascotDisc`, the
  wordmark and a `max-w-sm` slot.
- A spacing scale of its own: `pt-1.5 pb-4.5 px-5 pb-3.5`, and `gap-1.75` inside
  `InputField` / `ToggleField`, where `AuthTextField` takes the stock `Field` gap.
- `font-heading text-2xl font-semibold` on a step heading, against
  `text-xl font-bold` on the auth card titles; the sub-heading is
  `text-sm font-semibold text-muted-foreground` — a bold muted line that appears
  nowhere else.
- Step 2's back affordance is a ghost `ChevronLeft` floating above the title; the
  app has no other instance of that pattern.
- Nothing names the step the user is on.

## The shape

### The group layout

`(onboarding)/layout.tsx` mirrors `(auth)/layout.tsx`: a full-height centred
column, `MascotDisc` with `/mascot/guide.webp`, the wordmark below it
(`font-heading text-2xl font-semibold` — the one display-scale call site in this
flow), then the slot.

One deliberate divergence from auth: the slot is `max-w-xl`, not `max-w-sm`. Two
number fields side by side do not survive 384px, and the plan options go two
abreast at a 32rem container — which `max-w-xl` clears once the card's own
padding is off, and `max-w-md` does not. The difference is invisible in a flow,
since the two screens are never on top of each other.

The mascot is `guide.webp`, the same artwork as auth: the user arrives here
straight from `/register`, and the face should not change mid-transition.

### A step is a card

Both steps share one skeleton, so the rhythm comes from `--card-spacing` rather
than from per-step padding:

- `CardHeader` — "Step 1 of 2" as `text-sm text-muted-foreground`, then
  `CardTitle` at `text-xl font-bold` (the auth card title), then
  `CardDescription` at its own weight.
- `CardContent` — the step's body.
- `CardFooter` — `flex-col gap-4`: the disclaimer, then the action row.

No progress bar: two steps do not earn one, and the count is already in words.
`font-heading` leaves the step headings — a card title is not display scale, and
the auth titles do not carry it either.

Step 1's action row is `Continue`, full width, submitting `DETAILS_FORM_ID`
through `form=` as it does now.

Step 2's action row is `[Back] … [Confirm plan]` — `Back` as `variant="outline"`
at the left edge, `Confirm plan` at the right. The floating ghost chevron goes.

### Forms

`DetailsForm` keeps `flex flex-col gap-5`. That is the form rhythm of the whole
app (`login-form.tsx`, `register-form.tsx`), and `FieldGroup` — which
`AGENTS.md` asks for — is used by no form in this repository. Introducing it in
onboarding alone would separate the screen again, which is the thing this change
exists to undo. Whether the rule or the code should move is a separate question,
raised and left open here.

`gap-1.75` in `InputField` and `ToggleField` — and `gap-1.5` in `FigureField` —
go back to the stock `Field` gap. This reaches the goal-reached overlay and the
weight form too, where a field currently sits at 7px next to a stock one inside
the same dialog.

**A unit belongs in an addon, not in a label.** Height, current weight and
target weight become `FigureField`s: `Height` + `cm`, `Current weight` + `kg`,
`Target weight` + `kg`, the way every other figure in the app is drawn. Age
keeps `InputField` — it has no unit to put anywhere.

**One shadow setting across the controls of a form.** `Input` carries none, so
neither does anything sitting in a row beside it: `shadow-none` on the activity
`SelectTrigger` (at the call site) and on `FigureField`'s `InputGroup` (which
makes `compact`'s own `shadow-none` redundant — `compact` now only quiets the
label). The plan plates lose `Card`'s `shadow-xs` for the same reason. Nothing
in `ui/**` is edited to do this.

**The activity dropdown is drawn and placed as the sidebar's user menu is.**
`p-1` around the list, `align="start"`, and `alignItemWithTrigger={false}` so it
drops below the trigger instead of overlaying it — no other menu in the app
overlays its control.

**Focus is the fill orange.** `--ring` becomes `var(--primary)`, the colour the
selected plan plate and the pressed toggle already use, and the dark overrides
go (an alias needs no second value). This is a decision _against_ WCAG 2.2's 3:1
for a focus indicator, taken knowingly: the value that earned 3:1 read as brown.
The cost is pinned in `globals.spec.ts` — `light:--ring/--background` at 1.9 and
`light:--ring/--card` at 2.0 — so it is allowed to be bad and not allowed to
drift. Dark still clears 3:1 and is not listed.

### The shared plan picker

`PlanSelection` takes a new optional `secondaryAction?: ReactNode`, rendered
beside `Confirm plan` in its action row. Onboarding passes `Back`; the profile's
Change-plan dialog and the goal-reached overlay pass nothing and are unchanged.

The confirm button, its spinner and the submit error stay inside `PlanSelection`
— they are its state, not the caller's layout.

`PlanSelection`'s `gap-3.5` and `PlanOptionCard`'s `px-4.5 py-4` / `gap-1.5` move
onto stock steps. The card's radio semantics, `data-checked` state, focus ring
and `aria-label` are untouched: this is spacing only.

## Verification

- `npm test`, `npm run format:check`, `npm run lint -w backend`
- `npm run test:e2e` — the smoke net walks onboarding, and step 2's back
  affordance stops being an icon with `aria-label="Back"`, so any selector on it
  has to follow
- By eye at 360, 390, 768, 1024 and 1440 (device emulation for the two phone
  widths), and every changed screen at 1024 in both appearances — onboarding,
  `/profile` and the goal-reached overlay, since the plan picker is shared
