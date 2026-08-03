# 0009 — Visual style lives in the ui components

Status: superseded by [ADR 0010](0010-values-come-from-the-theme.md) (2026-07-31)

Left as written. This is the record that the boundary was tried, which is why
0010 supersedes it rather than editing it: 0010 says what it cost, and which of
the decisions below it keeps.

## Context

The frontend had three overlapping vocabularies for one set of colours: raw
`--fn-*` hexes, a layer of Paper aliases over them (`--color-text`,
`--color-surface`, `--text-caption`…), and shadcn's own role names. Call sites
reached into whichever layer was nearest, so ~700 visual class occurrences in
~60 files decided colour, type, radius, shadow and border for themselves.

That is not a tidiness complaint. Measured, it had produced six defects nobody
could see from any single file:

- **The type scale never applied.** `tailwind-merge` classifies `text-*` as
  either a font size or a text colour, using a built-in list of size keys. A
  theme-defined level like `text-caption` is not on that list, so it was filed
  as a colour, collided with the actual colour class beside it, and lost. That is
  why call sites wrote `text-[15px]` by hand — an arbitrary value _is_ recognised
  as a size, so it was the only thing that stuck. The scale was not being
  ignored; it was being deleted at merge time.
- **The radius scale was not monotonic.** `sm/md/lg` were px (8/12/20) while
  `xl` was a `calc()` of `--radius` (14px), so `rounded-lg` came out _larger_
  than `rounded-xl`, and two cards named the same looked different.
- **Toggle selection never worked.** It was written against `data-[state=on]`;
  Base UI emits `data-pressed`. The orange selection in onboarding had never
  appeared.
- **Fields zoomed iOS Safari** on focus, because an exported class string
  overrode the component's `text-base md:text-sm` with 14.5px.
- **`--font-heading` was never declared**, so `font-heading` in `card.tsx` and
  `drawer.tsx` compiled to nothing.
- **`--color-secondary` was declared twice** in one `@theme` block, so
  `bg-secondary` had never been the brand green.

Five exported class-string constants existed, and a fifth appeared _during_ this
work, a day after four were deleted — the pattern regenerates unless it is made
impossible.

## Decision

**All visual style lives inside `frontend/src/components/ui/**` as component
variants. Outside it, only layout, sizing and alignment.** Forbidden outside:
colour, background, font size and weight, radius, shadow, border. An ESLint rule
allow-lists structural prefixes and errors on everything else, including any
attribute ending in `className` and any `*_CLASS` constant.

Consequences of the boundary:

- Typography outside `ui/` needs a component, so `<Text variant tone numeric
render>` exists. A level sets size, line-height, weight and family at once —
  a level is not a size, which is why there is no `size` prop to combine with it.
- Colour roles keep shadcn's names, because a freshly pulled `shadcn add` depends
  on them existing and a missing token yields no CSS rather than a default. The
  two-layer form (`:root` bare, `@theme inline --color-x: var(--x)`) is a
  compatibility requirement, not legacy.
- `tailwind-merge` is configured with the type levels, without which the scale
  cannot compose with a colour class.
- Dark mode is removed entirely. There was no `ThemeProvider`, so `.dark` was
  never set and all 48 `dark:` variants were dead.
- The landing page keeps its own visual system in `app/landing.css`, imported by
  that one route. Glass, a gradient mesh, a serif accent and type via `clamp()`
  are not expressible in the app's roles, and forcing them in would mean
  inventing variants the product never uses.

## The design reference, and where we knowingly depart from a guideline

A design handoff arrived mid-migration — an HTML prototype of six screens plus a
README of tokens, kept outside the repository — and was adopted as direction,
not as truth. It independently reached the same contrast
conclusion this branch had — _"do not put white text on `#F5A65C` (2.2:1);
filled buttons use `#3B2314`"_ — which settled the CTA question, and it
overturned one of our decisions correctly: brand-coloured text had been banned
outright after measuring `#e08a3c` at 2.67:1, but the reference's accent
`#A85517` measures 4.9:1. Brand text is fine; it just has to be that dark. Its
warm neutral palette replaced our grey one wholesale — the app read as a grey
admin panel beside a design that reads as paper, and the whole difference was six
token values.

**One deliberate deviation from WCAG, recorded rather than hidden.** The focus
indicator is the brand peach `#F7A96A`, which measures **1.86:1** against a white
field where WCAG 2.2 §1.4.11 asks 3:1. Darkening it until it passed produced a
muddy brown border that read as damage rather than as attention, and it was
rejected on looks after being seen in the running app. Focus earns its visibility
from weight instead — two pixels rather than one. If this is revisited, the fork
to reconsider is _"a warm focus ring at all"_, not the value.

Two smaller accepted costs: the brand orange fills charts at ~1.9:1 against the
page where graphics want 3:1 (the reference does the same, and the arc is
labelled with a figure that carries the meaning); and the display levels stay at
weight 600 where the reference sets 800, because 600 is Fredoka's ceiling and a
synthesized bold smears a rounded face.

## Alternatives rejected

- **A deny-list lint rule.** Lets every utility nobody thought of through, so the
  boundary erodes with each tailwind release.
- **Redefining tailwind's own `text-xs/sm/base` scale** instead of adding
  semantic levels. Cheaper vocabulary, but a freshly pulled `ui/*` component
  would find `text-sm` meaning something its author did not intend.
- **`--shadow-*` tokens: none at all** (the original decision). Reversed: the two
  elevation tokens stay, because `AGENTS.md` already told contributors to add a
  token when a value is missing, and a rule contradicted by the code it governs
  does not hold. The brand _glow_ under the CTA is still deleted as a device.
- **Keeping `triggerClassName` and friends.** They pass visual classes through a
  prop the boundary cannot see. Components take the element instead:
  `trigger={<Button …/>}`.

## Consequences

`globals.css` goes from 340 lines across three vocabularies to 287 in one, 90 of
which moved to the landing. Visual class occurrences outside `ui/**` go from ~525
in the app to zero. Twelve components gained variants; nine new ones exist
(`Text`, `Spinner`, `Progress`, `ListRow`, `DetailList`, `Medallion`, `charts`,
plus `Card` and `Button` variants). The six defects above are fixed as a
side-effect of having one place to fix them.

The cost: `shadcn add` owns files in `ui/` by name, so a registry component
named `text.tsx` would overwrite ours. Accepted knowingly — remember it when
updating.

Details, tables and the full migration order: `docs/design/styling-rewrite-spec.md`.
