# The shell streams; the overlay waits

`(app)/layout.tsx` awaits up to three reads before it returns anything, so the
header, the sidebar and every page under them wait on all of them. Measured on
`/dashboard`: the response's first chunk arrives at the same millisecond as its
last (median 110ms locally, ~94KB in one piece). Nothing streams, even though
every route in the group has a `loading.tsx` whose whole purpose is to be shown
while its page resolves.

Two of the three reads exist for one consumer: the reached-target dialog, which
occupies no space in the layout. That is what moves behind a boundary.

## The boundary

`app/(app)/goal-reached-gate.tsx` — a Server Component beside the layout that
renders it, the way `(auth)/auth-text-field.tsx` sits beside its pages. It does
its own reads:

- `getCurrentGoal()`, and the dashboard only when there is one. `GET /dashboard`
  404s until onboarding is finished, so the check moves with the read rather than
  being left behind in the layout.
- `getProfile()` only when `reachedTarget` — the dialog's plan step computes its
  options from the body figures.

It renders the client `GoalReachedOverlay` with those as props. The layout wraps
it in `<Suspense fallback={null}>` and hands it to `AppShell` as an `overlay`
prop.

`null` is the honest fallback: the overlay draws nothing until a target is
reached, so a visit where it has not streamed yet looks exactly like the
overwhelming majority of visits, where there is nothing to show.

## What still blocks

`getCurrentUser()` and `cookies()`, in parallel — one round trip. The header and
the sidebar's user menu cannot be drawn without the user, and the appearance
seeds a provider that wraps everything.

`getProfile()` also still blocks, but only when the appearance cookie is absent:
a first visit from a device that has never chosen. ADR 0014 makes the cookie a
cache and the profile the truth, and correcting the appearance a frame late is
the cost that ADR already accepts — moving it behind the boundary would make the
flash longer, which is the thing the cookie exists to prevent.

`getCurrentGoal()` leaves the layout entirely. The pages call
`requireOnboarded()` anyway and `getCurrentGoal` is `cache()`d, so the request is
shared rather than doubled.

## Consequences to keep in step

`AGENTS.md`'s **Reading data** section describes three layout-level reads. After
this it is one, plus one conditional, plus a boundary — the section is edited in
the same change, or it starts lying.

## Verification

- The first chunk of `/dashboard` must arrive **before** the last. Today they are
  the same instant; that gap is the whole point and the measurable criterion.
- The first chunk carries the header and the sidebar, with the page's
  `loading.tsx` skeleton in place of the page.
- The overlay still appears when a target is reached — checked on an account whose
  current weight has met its goal, not only on one that has not.
- `npm test`, `npm run lint`, `npm run format:check`, `npm run test:e2e`, and both
  appearances.
