# 0012 — One tree per screen

Status: accepted (2026-08-03).

## Context

The app had exactly **one** breakpoint, `lg` (1024), and used it to mount two
copies of the same screen. `mobile-dashboard.tsx` (220 lines, `lg:hidden`) and
`desktop-dashboard.tsx` (172 lines, `hidden … lg:flex`) both rendered, both
subscribed to the same contexts, and both drew every gate state; `/meals` had
`MealGroupsAccordion` under `lg:hidden` beside `DesktopMealGroups`; `/profile`
had an `lg:hidden` header row. The shell — `AppSidebar`, `AppHeader` — was
`lg:`-gated too, so **below 1024 the app had no chrome at all** and each route
hand-rolled a header. Between 768 and 1023 the phone column ran full-bleed
across the whole viewport.

The twin is not free, and the bill is not mostly aesthetic:

- **Both trees mount.** The hidden one measures its charts inside a 0×0
  container, so recharts warned **22 times per dashboard load**.
- **State, focus order and requests double.** Two accordions over one dataset,
  two of every trigger, and `.first()` in every e2e selector to disambiguate
  them.
- **The trees drift.** By the time this was written they disagreed on four
  things, and the desktop one had come to show "Remaining today" **twice** — as
  a `StatWidget` and again as a ring — which nobody noticed because no single
  screen ever showed both compositions.
- **Accessibility drifts with them.** The desktop tree gave its four figures
  `sr-only` names, because NumberFlow renders per-digit spans with no accessible
  name of its own. The mobile tree never did. Whichever tree you delete, you
  lose something you did not know it carried.
- **Widths between the two get nobody's attention.** 768 was a phone layout at
  full bleed; 1024 gave the 7-day chart a 188px column, below the width at which
  recharts starts dropping weekday labels.

## Decision

**Each screen is one DOM.** The desktop composition survives as a
_rearrangement_ of the same blocks — a grid or flex direction change — not as a
second subtree. Outside `ui/**`, `hidden lg:*` and `lg:hidden` are not how a
layout differs by width.

**Three steps, two thresholds.** Phone (the base), `md` (768) and `lg` (1024).
Both thresholds appear in CSS and in JS, and the pairs must agree:

| Threshold | CSS   | JS                                                    |
| --------- | ----- | ----------------------------------------------------- |
| 768       | `md:` | `useIsMobile()` — the sidebar's sheet                 |
| 1024      | `lg:` | `DESKTOP_QUERY` — the weight drawer becoming a dialog |

**Five control widths: 360, 390, 768, 1024, 1440.** A layout change is verified
at all five, on the seeded account, before it lands. No horizontal scroll at any
width between them.

**A page owns a max-width only to keep a line readable**, and the test is what
the content is, not how wide the viewport is. A page of cards takes the frame:
`/meals`' `max-w-6xl` was deleted, because a cap there gave four narrow cards
with truncated names beside an empty page. A page of label/value rows does not:
`/profile` is `max-w-xl`, left-aligned, because stacked in one column at 1120px
a row's value sits a screen away from its label.

Both of those pages carried a cap before this map, and `/profile`'s was **the
same 576px it has now** — which is worth being honest about. The "before"
screenshots recorded it as a defect, and it was, but the defect was never the
number: it was a narrow column stranded in the middle of an otherwise empty
1440 while the page had no frame of its own. The shell gives it one. The cap
only had to stop being the _only_ thing shaping the page.

## What this costs, and it is a real cost

**One tree forces subtraction.** Two compositions can each keep their favourite
treatment; one cannot. Reconciling the dashboards meant deleting
`RemainingTodayRing`, the "Remaining today" and "Eaten today" widgets and
`StatWidget`'s `mascotSrc` — because a ring is a fixed 110px square that leaves
half a card empty at 360, while a bar and a figure stretch to any width. That is
a **narrower** set of visual devices than two trees could afford, and the map
that made these decisions was explicit that where the two disagreed, one of the
two existing treatments had to win rather than something new being invented.

The rule is worth it anyway: what the twin bought was two compositions nobody
compared, and what it cost was correctness at every width in between.

## Alternatives rejected

**Keep the twin, add breakpoints to each.** This is the cheapest change and it
fixes nothing structural: the trees still drift, both still mount, the charts in
the hidden one still measure 0×0, and the accessible names still live in
whichever copy happened to get them.

**Render both and hide one, but only for the hard blocks** (a ring at `lg`, a
bar below). Rejected on sight while reconciling the dashboards: it is exactly
the pattern this ADR exists to delete, at a smaller scale where it is harder to
see.

**Container queries.** Ruled out for the two charts, which already answer to
their container through recharts' `ResponsiveContainer`. Still open for anything
that ends up living in two different column widths — a meal row, a stat widget.
Note the trap: `ChartContainer` _types_ `minWidth` and `aspect` and then never
destructures them, so they land on a `<div>` and do nothing.

## Consequences

- The console lost 22 warnings per dashboard load.
- The header is one row and simply sticky. It briefly was not: while the day
  picker lived in it, the header carried a second row below `lg` and had to be
  `display: contents` there so that the chrome row alone could stick — a sticky
  box sticks inside its parent, so a two-row header pins both. Moving the picker
  onto the two pages that show a day removed the need for the trick, which is
  worth recording as the cheaper answer to a layout that fights sticky
  positioning: take the second row out of the sticky element rather than
  dissolving the element.
- A figure rendered by NumberFlow **must** carry an `sr-only` name with its
  visual copy `aria-hidden`, since there is now only one place for it to live.
  `spokenStat` in the dashboard's `helpers.ts` is the shared formatter.
- The e2e suite is the check that a rearrangement kept its accessible names: it
  passed unchanged through all five screen migrations.
- Two thresholds mean the 768–1023 band is a real step with its own answers —
  the sidebar is an icon rail there, `/meals` is two columns, `/profile` is one.
- A 44px touch target is a **hit area**, not a size: `touch-target` in
  `globals.css` centres an invisible box on an icon-only control, so
  `ui/button.tsx` stays at upstream's scale. Note that this is not the project's
  only answer to the criterion — ADR 0010 already diverges on **fields**, which
  are `h-11` outright. Buttons are the surface where a 44px box would be visible
  and wrong, which is why they get the overlay and fields do not. Two overlays
  on neighbouring controls overlap, which is why `meal-line.tsx`,
  `weight-history-row.tsx` and `day-nav.tsx` carry wider gaps than their look
  needs.
- **The rule has no enforcement**, and that is a known hole: `touch-target` is
  opt-in, so a new icon-only control is born without it and only review will
  catch that. A lint rule beside `no-literal-values.js` is the obvious next step
  if it starts drifting.
