# 0011 — One tree per screen

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

**No page owns a max-width.** The shell owns the page frame. A cap on a route is
what left `/profile` a 576px column against the left edge of 1440 and `/meals`
four narrow cards with truncated names. If a cap is ever wanted it belongs to
the shell's content box, once.

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
- `AppHeader` is `display: contents` below `lg` so that its **first row alone**
  can be sticky. A sticky box sticks inside its parent, so a two-row header would
  have pinned the day nav along with the chrome and spent 128px of an 800px
  viewport. This costs nothing semantically here because `SidebarInset` already
  renders the page's `<main>`, so that `<header>` was never a `banner` landmark.
- A figure rendered by NumberFlow **must** carry an `sr-only` name with its
  visual copy `aria-hidden`, since there is now only one place for it to live.
  `spokenStat` in the dashboard's `helpers.ts` is the shared formatter.
- The e2e suite is the check that a rearrangement kept its accessible names: it
  passed unchanged through all five screen migrations.
- Two thresholds mean the 768–1023 band is a real step with its own answers —
  the sidebar is an icon rail there, `/meals` is two columns, `/profile` is one.
