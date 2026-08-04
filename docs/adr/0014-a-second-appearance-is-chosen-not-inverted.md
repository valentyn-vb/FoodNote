# A second appearance is chosen, not inverted

ADR 0010 removed dark mode rather than disabling it: no `.dark` selector, no
`next-themes`, no second value anywhere in the theme. That was the right call at
the time — a light palette had just been derived pair by pair, and shipping a
mechanically inverted copy of it would have thrown away the measuring. This
brings the second appearance back, and records the shape it takes so the next
reader does not have to reconstruct it from `globals.css`.

The claim in the title is the whole decision. Every dark value is picked against
a dark surface and measured there. None of them is a transform of its light
counterpart, and one of them — `--primary` — is not a second value at all.

## The trigger: a setting, and `system` is one of its values

The appearance is a field on the profile: `light | dark | system`, defaulting to
`system`.

The cheaper design is `prefers-color-scheme` alone. It costs nothing — no
contract, no persistence, no unstyled flash, because CSS resolves before the
first paint — and it was rejected for one reason: it has no answer for a user
whose device is dark and who wants this app light. That user has no lever at all.

Having taken the setting, `system` has to be a value rather than the absence of
one. Three routes — `(auth)`, `(onboarding)` and the marketing page — have no
profile to read, so _something_ has to decide their appearance, and the only
honest answer there is the device. A two-value setting would leave that state
unnamed and working anyway, which is the worst of the three shapes: it exists,
it just is not written down.

So the CSS carries three states across two selectors, and the explicit ones must
win **in both directions**:

`color-scheme` rides along on the same three states — `light dark` for `system`,
`only light` and `only dark` for the two explicit ones — so native UI (form
controls, the scrollbar, the caret) follows without a token of its own.

```css
:root {
  /* light values */
}

@media (prefers-color-scheme: dark) {
  :root:not([data-appearance='light']) {
    /* dark values */
  }
}

:root[data-appearance='dark'] {
  /* dark values */
}
```

The `:not()` is the part that breaks if it is dropped. Without it, `light` on a
dark device does not override the media query — it merely fails to add anything —
and the setting silently does nothing for exactly the user it was built for. It
is also invisible on a screenshot of a light-mode machine, which is why the
review checklist names it.

## Why the word is `appearance`

`theme` is the conventional name — `next-themes` uses precisely `theme` with
precisely these three values — and it is not available here. In this repository
"the theme" already means the token set: `@theme` in `globals.css`, "a value
comes from the theme" in `AGENTS.md`, and ADR 0010's own filename,
`values-come-from-the-theme`. Giving the word a second referent makes the
sentence at the centre of the styling doctrine ambiguous — "change the theme"
would mean either _edit the tokens_ or _switch which set is live_.

That is the same mistake this palette already refused twice: there are two brand
oranges because one token could not both fill and write, and this change adds
`--color-chart-empty` because `--muted` could not mean "absence" in both
appearances. A word is a token too.

**On screen the word is "Theme".** The argument above is about the codebase, not
about the user: "Theme" is what every other app calls this, and a person changing
it has never heard of `@theme`. So the section heading, the submenu and the
labels all read Theme, while the field, the cookie, the attribute and every
identifier read `appearance`. The ambiguity this ADR is avoiding lives in the
repository, and that is exactly where the distinct word is kept.

The cost is named rather than dodged: if `next-themes` is ever adopted, its
`theme` will have to be mapped to our `appearance`. One adapter, in one place.

## Where the value lives, and why there is a cookie

The profile field is the source of truth. A cookie mirrors it, and the cookie is
what the render actually reads.

The alternative is for the root layout to fetch the profile, and it is worse than
it sounds: the root layout serves the marketing page and the auth routes too, so
every document request — including the ones with no session — would wait on an
API call to decide a colour. The cookie is read synchronously with `cookies()`,
on every route, with no network.

`ui/sidebar.tsx` already stores its open state this way, so the mechanism is the
project's own rather than a new one.

**The rejected shape: one declaration instead of two.** `light-dark()` holds both
values in a single declaration and would have removed the duplicated dark block
entirely. It cannot be used here. A custom property's computed value is its token
stream, so `getComputedStyle(html).getPropertyValue('--primary')` returns the
literal text `light-dark(…)` rather than a colour — and
`goal-reached-overlay.tsx` reads four tokens exactly that way to hand them to
canvas-confetti, which paints on a canvas and cannot take a CSS variable. The
duplication is the price of that one JS consumer; `globals.spec.ts` asserts the
two blocks agree, which is what a comment could not.

**What reading the cookie costs.** `cookies()` is a request-time API, so a layout
that reads it renders dynamically — and this is the _root_ layout, so that is
every route. Measured on this change: all eight routes moved from `○ (Static)` to
`ƒ (Dynamic)`, the marketing page included. Nothing in the app used a request-time
API before it (`lib/server/session.ts` and `lib/server/fetch.ts` have no callers
yet), so this is the first thing here to opt out of static rendering.

The alternative that keeps them static is a blocking inline script in `<head>`
reading `document.cookie` before the first paint — flash-free too, and what
`next-themes` does. It was not taken: a script in the document is a second
mechanism to own, and at this app's scale a server render of the landing page
costs less than that. If the landing page ever needs to be static again, this is
the one file to revisit.

**The client writes the cookie**, with `document.cookie`, after a successful
`PATCH`. The right owner is a Next Server Action — `lib/server/cookies.ts`
describes Next as the BFF and names "the auth Server Actions (login, logout)" —
but that writing half does not exist yet: nothing in `frontend/src` uses
`'use server'`, and `SESSION_COOKIE_OPTIONS` has no caller. Building it here
would make a palette change the first PR to open the BFF's write path, and the
review would be about architecture instead of colour. It is #86's, and moving one
line into it later is a five-minute edit.

The accepted cost: the cookie can disagree with the profile, and does on a first
visit from a new device — one frame in the wrong appearance before the client has
read the profile and rewritten the cookie. This is a cache, and it is allowed to
be one frame stale.

## The contract: `PUT` does not take it

`appearance` is added to `profileResponseSchema` and to
`patchProfileRequestSchema`, and **not** to `putProfileRequestSchema`.

`putProfileRequestSchema` is the onboarding form, literally — age, sex, height,
activity level — and onboarding does not ask about appearance. Adding an optional
field there to preserve `patch = put.partial()` would make the schema describe a
request that never happens. The `.partial()` relationship was a coincidence of
shape, not an invariant; the file's own comment already treats `PUT` and `PATCH`
as different operations.

One consequence falls out for free: `GET /api/profile` is 404 until a profile
exists, so a signed-in user without one has no appearance — and the fallback is
`system`, which is also the default. No branch is needed for that state.

## Choosing the values

The dark surfaces stay in the light palette's hue family, with a **chroma ceiling
of 0.015** on every surface token — background, card, popover, secondary, muted,
accent, border, input.

The ceiling is the whole technique. A warm dark surface with real chroma does not
read as dark, it reads as sepia, and that is how warm dark themes fail. The
answer is the one this palette already found in light, where the page background
was cut to half its original chroma (`0.004`) precisely so it would stop reading
as a colour of its own: **warmth comes from hue, not from saturation.**

`--card` stays lighter than the page, as it is in light (`0.982` against `1`, a
step of 0.018). On a dark surface that step is what carries elevation, because
shadow barely reads there.

`--foreground` drops to chroma ~0.015 in dark, from `0.045` in light. The
surfaces already carry the warmth; text repeating it costs contrast against the
brand ink for nothing.

## The two oranges, and the label that flips

This is the section a future reader will come looking for, because the result
looks like a mistake.

In light, `--primary` is `oklch(0.788 0.13 62.2)` with a white label at
**2.00:1** — the palette's one deliberate contrast exception, taken by the team on
review of #106 with the number known. The app's own ink on that fill measures
**7.3:1** and was rejected on looks; darkening the orange to `0.577` to earn white
its 4.5:1 was rejected as too brown.

Note what does _not_ change with the appearance: both sides of that ratio are
inside the button. A dark mode that leaves the button alone inherits 2.00:1
verbatim, in a second place, and looks worse doing it — a very light fill on a
very dark page with a white label reads as smeared.

So `--primary` keeps **one value across both appearances**, and the label flips:
in dark, `--primary-foreground` is the dark ink, at that same 7.3:1. A bright fill
on a dark page taking a dark label is the convention, not an experiment, for the
same reason it is bright.

Three things this buys. The dark appearance has **zero** contrast exceptions.
`--primary` becomes one more token needing no second value chosen. And #106's decision is not reopened — it stays exactly where it was
taken, in light, which is why ADR 0010's line 178 ("keep the dark label —
rejected by the team on look") remains true as written.

The cost, accepted with eyes open: **the primary button's label is a different
colour in the two appearances.** A side-by-side screenshot shows a white
"Log a meal" and a dark one. Formally these are two states of one component, not
an inconsistency — but it will be noticed on review, which is why it is here.

`--brand-ink` needs the opposite treatment. At `oklch(0.541 0.129 51.5)` it
carries 4.9:1 on the cream and nowhere near that on a dark surface, so it has to
rise — and the room above it is narrow, between `--primary` at `0.788` and
`--foreground` near `0.93`. In dark it goes **lighter than the fill**, starting
from `oklch(0.855 0.105 52)`, with chroma below its light value because the same
saturation reads stronger against dark.

That inverts the light-mode order, and the inversion is the point: the invariant
was never "ink is darker than fill". It is **ink carries text contrast, fill
carries a shape**, and that holds in both directions. Three pairs get measured,
not one — `brand-ink` on `--background`, on `--card`, and _against `--foreground`_,
because the last is what a link inside a paragraph actually tests.

That third pair is where this decision is paid for, and the number is worth
knowing: **1.39:1** in dark against 2.77:1 in light. Putting the ink above the
fill leaves it between 0.788 and body text at 0.945, and there is no arrangement
of that corridor that reaches the 3:1 a colour-only link wants — light does not
reach it either. In dark the cue is therefore hue and the hover underline more
than lightness. The honest alternative is to put the ink _below_ the fill in dark,
around L 0.65, which measures 2.77:1 against body text and 5.5:1 against the page
— at the cost of the invariant above. This is the one place in this ADR where the
choice could reasonably go the other way.

## The charts, and a token for absence

The five chart hues are re-picked against the dark surface: one lightness band
(~0.78–0.82), chroma below the light values, hues at least 45° apart. `--chart-1`
stays an alias of `--primary` — the brand is the first series, and `--primary` did
not move — so the coral is what has to travel.

The strictest constraint is not the background. `CALORIE_SPLIT_COLORS` in
`charts.tsx` draws **four hues at once** in the donut, in a ring 14 units thick
with no separating stroke, so adjacent sectors touch: six pairs to keep apart,
not four values to keep visible. Today `chart-1` (hue 62) and `chart-3` (hue 31)
are 31° apart at almost the same lightness — borderline on cream, and worse on
dark, where the orange spreads.

`--chart-5` is used nowhere. It gets no dark value: a value chosen and never
looked at is worse than a missing one, which at least yields no CSS.

The `remaining` sector needs a token of its own, `--color-chart-empty`. Its job is
to read as _absence_ — the unfilled part of the target, not a fifth meal — and
`--muted` cannot do that job in both appearances. In light, `--muted` is nearly
white on a white card and absence is automatic. In dark, a surface token must be
_lighter_ than the page to read as a surface at all, and a ring sector lighter
than its background reads as drawn. Pulling `--muted` toward the card to fix the
ring would break it everywhere else it is used.

In light the new token is an exact copy of the current `--muted`, so the diff is
visibly a no-op. `charts.tsx` changes by one string — which is the reason for the
token rather than a branch: the second appearance stays a set of values in
`globals.css`, and the first `if (appearance === 'dark')` in a component is the
one that teaches the next person that branching is fine.

## The `dark:` rules that survive

Eight `dark:` rules remain in `ui/**`, in `button`, `badge` and `calendar`
(`avatar`'s is only a comment). ADR 0010 dropped them from registry files on the
grounds that this app has no dark mode; #145's own text expected them all to be
re-derived. On inspection they split in two, and only one has to go.

Seven of them — `dark:aria-invalid:ring-destructive/40`, `dark:bg-destructive/20`,
`dark:hover:bg-muted/50`, `dark:hover:text-foreground` and their neighbours — do
one thing: they raise an opacity, or damp a hover, because a 20% layer over a dark
surface is nearly invisible. Not one contains a literal; they all reference
tokens. That is the physics of a translucent layer, true for any palette
including this one, so they stay as upstream wrote them.

The eighth is a different design.
`button.tsx`'s `dark:border-input dark:bg-input/30 dark:hover:bg-input/50` makes
upstream's dark outline button a translucent field-coloured fill — but this app's
outline button is `bg-card` with a brand-tinted hover border, already a
deliberate divergence. Keeping upstream's dark rule would leave one component
disagreeing with itself across appearances. It is replaced, and the reason is
commented in `button.tsx`, where whoever diffs against upstream will be standing.

## The control, and why it is not a form

The setting appears twice: a `Theme` section third on `/profile`, and a
`Theme ▸` submenu in the sidebar's user menu. Two entry points because people
change this at dusk, not once at signup — and never inside `EditProfileDialog`,
which sends the full `PUT` that by the contract above does not carry the field.

The section is a radio list, not a segmented control: three named options that
each deserve a hit area and a label, in a column, under a heading that matches
`Current plan` and `Personal details` beside it. Each option is a bordered box
that highlights when chosen — the meal drawer's option look, written at this call
site rather than turned into a variant, down to the detail that selection changes
the border's colour and never its width, so picking one does not nudge the row. It is a plain `section` + `h2`
rather than the `FieldSet`/`FieldLegend` the Forms rule asks for, because Base
UI's RadioGroup already exposes `role=radiogroup` — a fieldset around it would be
a second group wrapping the first, and the heading names it through
`aria-labelledby` without the word appearing twice.

Two entry points in sibling subtrees means one owner, and the project has the
precedent already documented: `MealsProvider` sits in `(app)/layout.tsx` so the
sidebar's trigger and the dashboard's numbers share state. `AppearanceProvider`
sits beside it and is the only thing in the app that knows about appearance at
all — it sends the `PATCH`, writes the cookie, and sets
`document.documentElement.dataset.appearance`. Both controls are consumers, so
they cannot drift.

The provider is deliberately **not** the source of the first frame. The attribute
is already on `<html>` from the server; the provider only continues what the
server started. Confusing the two brings back the flash the cookie exists to
prevent — and `(app)/layout.tsx` renders a spinner first, which makes the mistake
easy to miss.

Saving is instant and optimistic: the attribute changes immediately, the `PATCH`
follows, and a failure reverts the value and raises a `toast.error`. The
feedback is the page repainting, which no spinner improves on.

`AGENTS.md` says every form follows **Forms** — `useForm`, `zodResolver`,
`Field`/`FieldError` — and this control does not. The rule exists so that
validation and its messages have exactly one owner, Zod. Here there is nothing to
validate: three fixed options, no reachable invalid state, no `FieldError` to
fill, and the only possible failure is a network one, which that same rule
already routes to a toast. `react-hook-form` has no work to do, and `Controller`
has no form to bind to. What the section keeps from the field primitives is the
one piece that still has a job — `FieldDescription`, for the hint under the boxes
— so it reads like the rest of the app without a `FieldSet` wrapping a
`role=radiogroup`, as above.

## What this supersedes

ADR 0010 stands, except for two sentences. "No dark mode. Removed, not disabled"
(line 84) and "`dark:` rules are dropped from registry files" (line 158) are
superseded here. Line 178 — the dark-label rejection from #106 — is **not**: it
was a decision about the light appearance and it survives unchanged, as described
above.

Everything else 0010 argues is what made this tractable at all. Because
`eslint-rules/no-literal-values.js` bans colour literals anywhere in a `.tsx`,
including inside `style={{}}` and chart props, every colour in the app already
resolves through a token. A second appearance is therefore a change to
`globals.css` and a switch, not a sweep through components — one token rename in
`charts.tsx` and one rule in `button.tsx` are the entire component-level cost.

That is the return on 0010, collected.

## The one thing that is now automated

`:root` holds 35 declarations, and 11 of them are `var()` aliases — so the second
appearance is **24 values**, less one for `--primary`, which does not move. That
is a smaller job than #145's text implies, and every one of those values carries a
measured ratio defended until now by a comment and a reviewer's memory. A
test reads `globals.css`, computes contrast for a declared list of pairs in both
appearances, and fails below 4.5:1. The allowlist has exactly one entry: white on
`--primary` in light, pointing at #106.

Without it the decay is predictable — someone nudges `--muted-foreground` half a
step "so it reads better" and takes four pairs with them. The literal-ban lint
rule is the same idea one layer down; this is the layer that was missing.

It also found something on its first run, in light rather than dark, and that
find is fixed here. `--ring` exists because the fill orange reaches only 2.0:1
against white where a focus indicator wants 3:1 — and the ring measured
**1.84:1** on the page and 1.94:1 on a card, _below_ the fill it replaced. The
substitution had bought nothing. It is now `oklch(0.648 0.15 58.7)`: 3.23 and
3.41, the lightest value at the ring's own hue that clears the criterion on both
surfaces, with the chroma raised from 0.122 as the lightness came down, because a
warm colour darkened at constant chroma turns brown. It stays 1.59:1 from the
fill, so a focused button still reads as one.

This is a light-palette change inside a dark-mode ADR, and it is taken
deliberately: the test found it, the fix is one value, and leaving a focus
indicator below its criterion to protect a scope boundary is the wrong trade.

---

_On the number: 0014 is the next free one, and 0011 is not free. Two PRs claimed
it independently — `d4d0e43` (per-100 g density, #137) and `a64b0fa` (voice
dictation, #141) — so `docs/adr/` now holds two files numbered 0011, and the
string "ADR-0011" appears in `meal-item.entity.ts` meaning the first and in
`voice-dictation.tsx` meaning the second. It had looked free because `5a4ddde`
renamed the one-tree ADR off it, which is the trap: a vacated number reads as
available and is not, because older references still point at what used to be
there. An ADR number is an identifier, so this one is left alone rather than
reused a third time; untangling the two that exist is its own change._
