# 0010 — Values come from the theme, not styles from components

Status: accepted (2026-07-31). Supersedes
[ADR 0009](0009-visual-style-lives-in-components.md).

## Context

ADR 0009 moved all visual style inside `components/ui/**` behind a lint rule
that allow-listed structural prefixes. It worked: the six defects it names were
real, they were fixed, and ~525 visual class occurrences left the app's markup.

The bill arrived afterwards, in the form of a vocabulary nobody could hold in
their head:

- seven semantic type levels and six tones, reachable only through `<Text
variant tone numeric render>` — **82 call sites**
- seven `Card` variants, nine `Button` variants, five `Input` variants, a
  `Badge` with **zero** call sites
- ~30 colour tokens across three name families
- five style-only wrapper components (`Text`, `ListRow`, `DetailList`,
  `Medallion`, `Badge`) whose whole job was to hold classes the boundary would
  not let a call site write

Every line of markup paid a naming tax. Writing `text-sm font-semibold` was
forbidden; the sanctioned form was `<Text variant="label">`, which meant knowing
that `label` is 15/600 — and `caption` 13/400, and that `caption` and `body`
differed by 2px for no reason anyone could point at. Adding a look meant adding
a variant, so the variant sets grew monotonically, and `shadcn diff` stopped
being able to say anything about `ui/**` at all.

The allow-list had the same shape of cost. It listed _structural_ prefixes, so a
tailwind utility nobody had classified was forbidden by default. That direction
was chosen deliberately — a deny-list erodes with each release — but it means
the rule must be widened by hand for every new utility, and each screen migrated
before the rule changed bought itself a line in an ignore list. That list reached
**26 entries**.

Underneath all of it, exactly one thing was load-bearing: **a value written in
markup instead of read from the theme.** The 71 hardcoded font sizes on `main`
(`text-[12px]` ×17, `text-[12.5px]` ×8, `text-[14.5px]` ×7…) are the disease.
`text-sm` never was.

## Decision

**Values come from the theme. Utilities built from those values are legal
anywhere.**

- The ESLint rule (`frontend/eslint-rules/no-literal-values.js`) bans _literals_,
  not utilities. A colour literal — `#hex`, `rgb()`, `hsl()`, `oklch()` — is an
  error anywhere in a `.tsx`: in a class, a plain string, a `style={{}}`, a chart
  prop. An arbitrary value in a visual group is an error when it references no
  token, so `rounded-[calc(var(--radius)-5px)]` and
  `bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]` pass and
  `text-[13px]` does not. Layout is unconstrained; variants (`data-[state=open]:`,
  `has-[…]`) are selectors, not values.
- **The type row is tailwind's own.** No semantic scale. A level is a size class
  plus a weight class, written where it is used.
- **`ui/**` holds only what `shadcn add` brought**, at upstream's variants. Style-only
  wrappers are deleted; components that _draw_ (`gauge`, `sparkles`,
  `shield-check`, `charts`) live in `components/`.
- **The token set is shadcn's own colour roles** plus `chart-1..5`, the sidebar
  shims, and three additions: `--success`, `--warning`, `--brand-ink` — 35
  values in `:root`, six of those names non-stock.
- One `--radius`, shadcn's own `sm/md/lg/xl` formula off it, and tailwind's
  shadows. No elevation tokens of our own.

## What survives from 0009

Not everything in it was the boundary, and the parts that were not are kept:

- **No exported class strings.** `*_CLASS` constants stay banned, for 0009's
  reason: a shared class string is a component variant nobody wrote, and the
  pattern regenerates — a fifth constant appeared _during_ that migration, a day
  after four were deleted.
- **Values live in `@theme`, not in the head or in markup.** That is the whole of
  this ADR, arrived at from the other side.
- **Colour roles keep shadcn's names**, because `shadcn add` depends on them and
  a missing token yields no CSS rather than a default. The two-layer form (bare
  `--x` in `:root`, `--color-x: var(--x)` in `@theme inline`) is a compatibility
  requirement.
- **A `*ClassName` prop is not how a component takes a styled part** — it takes
  the element: `trigger={<Button …/>}`. Under 0009 this was a boundary leak;
  under 0010 it is an interface argument, and it holds either way.
- **No dark mode.** Removed, not disabled. Adding one back is a design effort.
- **The contrast findings**, which are measurements and do not depend on where
  style lives: `#F5A65C` reads 2.0:1 as text and is a fill; brand text is
  `--brand-ink` at 4.9:1; a filled button's label is the app's own ink at 7.3:1.

## What 0009 got right that this ADR pays for

0009's central claim — that a deny-list erodes — is true, and this rule is a
deny-list. It bans colour literals and untokenised values and nothing else, so a
future tailwind utility that hardcodes something new will pass until someone adds
it. That is accepted: the class of defect it lets through is a wrong-looking
value in one file, against a naming tax on every file.

The second cost is uniformity. Under 0009, two rows that looked alike were
provably the same component; now they are two call sites that agree, and nothing
stops them drifting. The counter-pressure is that a look shared by two call sites
is still a candidate for a component — the rule is no longer what forces it.

## Named divergences from upstream

`ui/**` is meant to survive a `shadcn diff`, so every intentional difference is
listed here rather than discovered later:

- **Touch targets.** `Input`, `SelectTrigger` and `InputGroup` are `h-11` (44px)
  against upstream's `h-9`; `Button size="lg"` is `h-12`,
  `icon-lg` is `size-11`; `Toggle size="lg"` is `h-11`. Horizontal padding is
  upstream's, so the divergence is height and nothing else. 44/48 is a
  thumb-target argument, not a style one.
- **`Card` is bounded by a `border`,** not upstream's `ring-1
ring-foreground/10`. A ring means focus and invalid state here, so a card and
  a focused card must not be drawn the same way.
- **`Button variant="link"` reads `text-brand-ink`,** not `text-primary`:
  `--primary` is the fill orange and fails contrast as text.
- **`dark:` rules are dropped** from registry files. This app has no dark mode,
  and a rule that can never match is a rule nobody can verify.
- **`ring-[3px]` and the tooltip arrow's `rounded-[2px]` are upstream's**, which
  is why the lint rule allows an untokenised _length_ inside `ui/**` — but never
  a colour literal or a hardcoded type value.

## Alternatives rejected

- **Editing ADR 0009 instead of superseding it.** The record that the boundary
  was tried, and what it cost, is the most useful thing this pair of ADRs says.
  0009 is marked superseded and otherwise left alone.
- **Keeping `<Text>` for the type scale only.** The prototype behind #96 put
  three mappings on a real screen and the flat utilities read better than
  `<Text variant tone>`; keeping the component would have kept the tax with none
  of the constraint.
- **A `@layer base { h1, h2, h3 }` rule for the brand face.** Decided while
  charting and disproved on screen: it puts Fredoka on section headings, which
  was the losing variant. Fredoka is applied explicitly at display-scale call
  sites — a heading's rank does not imply a face.
- **Clearing the literals out of `marketing/**`.** The deck holds 34, its own
  palette. Removing them means redesigning it or minting a token per gradient
  stop; it is excluded from the rule alongside the vendored `canvasui/**` and
  `evilcharts/**`.

## Consequences

`:root` goes from 44 values to **35**, six of them non-stock. `globals.css` loses
the 27-declaration type block. `ui/**` is **25 registry files** — five wrappers
and four drawing components out. Every invented variant is gone, so `shadcn diff`
means something again. `lib/utils.ts` is back to stock `twMerge`: with no
bespoke scale, there is nothing to teach it.

The traps that were true under 0009 are still true — Turbopack not invalidating
`@theme`, a deleted token yielding no CSS at all, `shadcn add` owning `ui/` by
filename, the load-bearing import order in `globals.css`. The one that dies is
teaching `tailwind-merge` a type scale.

Details, tables and the migration order:
[`docs/design/styling-rewrite-spec.md`](../design/styling-rewrite-spec.md). The
route, ticket by ticket, is
[issue #94](https://github.com/valentyn-vb/FoodNote/issues/94).
