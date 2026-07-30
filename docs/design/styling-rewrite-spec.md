# Styling spec: the tokens, the components, the boundary

The reasoning is in [ADR 0009](../adr/0009-visual-style-lives-in-components.md).
This is the reference: what exists, what it is for, and what is not allowed.

## The boundary

**Inside `frontend/src/components/ui/**`:** colour, background, font size and
weight, radius, shadow, border. Everything visual.

**Outside it:** layout (`flex`, `grid`, `gap`, padding, margin, width, height,
`order`, position, `z`), alignment and wrapping (`text-center`, `truncate`,
`text-balance`), casing and figure style (`uppercase`, `tabular-nums`), motion
(`transition-*`, `animate-*`, `opacity-*`), and breakpoint or state prefixes on
any of those.

Enforced by `frontend/eslint-rules/no-visual-classes.js` at `error`, over
`app/**`, `components/*.tsx` and `components/onboarding/**`. Out of scope by
decision: `components/marketing/**`, `components/canvasui/**`,
`components/evilcharts/**` — three separate visual systems, not a lagging part of
this one.

The rule reads any attribute ending in `className`, the arguments of `cn()`,
`cva()` and `clsx()`, and rejects any `*_CLASS` constant. A `*ClassName` prop is
not a workaround — pass the element instead: `trigger={<Button …/>}`.

## Colour roles

All values are oklch: `color-mix(in oklch, …)` and `/opacity` are only
predictable there, and shades and states are derived in the components rather
than held as tokens.

| Role                                | Value                   | For                                                                               |
| ----------------------------------- | ----------------------- | --------------------------------------------------------------------------------- |
| `--background`                      | `#FAF6F0`               | the page                                                                          |
| `--foreground`                      | `#3B2314`               | all primary text (13.6:1)                                                         |
| `--card`, `--popover`               | white                   | surfaces                                                                          |
| `--muted`                           | `#FBF3EA`               | a passive warm surface                                                            |
| `--muted-foreground`                | `#7A6252`               | secondary text (5.3:1)                                                            |
| `--secondary`, `--accent`           | `#FDFAF6`, `#FFF1E4`    | button surface, hover                                                             |
| `--primary`                         | = `--brand`             | the CTA fill                                                                      |
| `--primary-foreground`              | = `--foreground`        | its label (7.3:1)                                                                 |
| `--brand`                           | `#F5A65C`               | fills: CTA, mascot, mesh, the chart arc                                           |
| `--brand-ink`                       | `#A85517`               | brand _text_: links, active nav, an emphasized figure (4.9:1)                     |
| `--brand-line`                      | `#FAD9BE`               | a hairline that should read as accent, not structure                              |
| `--brand-focus`                     | `#F7A96A`               | the focused control                                                               |
| `--brand-soft` / `-softer`          | `#FFEAD6` / `#FFF1E4`   | washes to sit on                                                                  |
| `--brand-mint` / `-coral`           | `#5BB98C` / `#F4907E`   | decoration only — the gradient mesh                                               |
| `--success`                         | `#4F9A5E`               | "on plan": fills, borders, icons                                                  |
| `--warning`                         | coral, darkened         | "worth a look"                                                                    |
| `--destructive`                     | `#C0392B`               | error and over-target                                                             |
| `--*-surface` / `-border` / `-text` | see globals.css         | feedback washes (toasts, callouts) — the text weight clears 4.5:1 on its own wash |
| `--border`, `--input`               | `#F0E4D8`, `#EFE0D2`    | structure                                                                         |
| `--ring`                            | = `--brand-focus`       | focus                                                                             |
| `--track`                           | `#F2E7DB`               | progress track                                                                    |
| `--sidebar-*`                       | references to the above | compatibility shims `shadcn add sidebar` greps for                                |

**The rule about brand and text:** the brand hue fills and carries dark text; it
does not _become_ text unless it is `--brand-ink`. Measured on white,
`#f5a65c` reads at 2.0:1 and `#e08a3c` at 2.67:1, against a 4.5:1 threshold.

## Type

One scale, seven levels, consumed through `<Text>`. A level sets size,
line-height, weight — and family and tracking where they belong to it. **A level
is not a size**, which is why `Text` has no `size` prop.

| Level      | Size / line-height           | Weight | Family  |
| ---------- | ---------------------------- | ------ | ------- |
| `overline` | 11 / 1.3, +0.06em, uppercase | 700    | sans    |
| `caption`  | 13 / 1.4                     | 400    | sans    |
| `body`     | 15 / 1.5                     | 400    | sans    |
| `label`    | 15 / 1.45                    | 600    | sans    |
| `title`    | 18 / 1.35                    | 700    | sans    |
| `heading`  | 26 / 1.2, −0.01em            | 600    | Fredoka |
| `display`  | 40 / 1.05, −0.015em          | 600    | Fredoka |

`<Text variant tone numeric render>`; `tone` is `default | muted | onFill |
danger | brand | success`. `render` takes the element to render as, so the level
and the heading rank can disagree — they usually do.

Two constraints worth knowing before you reach for a level:

- **Fields cannot take one.** `text-base md:text-sm` stays inside `Input` and
  `Textarea`: 16px on mobile is what stops iOS Safari zooming on focus, and
  `body` is 15px. This is a platform constraint, not a preference.
- **`tailwind-merge` must know the levels.** They are registered as font sizes in
  `lib/utils.ts`. Without that, `cn('text-heading', 'text-foreground')` returns
  only the colour.

The default tailwind row (`text-xs/sm/base/lg`) is untouched, because the `ui/*`
components themselves use it.

## Radius, elevation, focus

Radii are explicit px and monotonic: `--radius` 12, `sm` 8, `md` 12, `lg` 18,
`xl` 20. Button and field `md`; tile, row and list `lg`; card, drawer and dialog
`xl`; avatar, badge and progress `full`.

Elevation has two tokens — `--shadow-card` and `--shadow-hairline` — plus
tailwind's own `shadow-xs/md/lg` for popovers and drawers. There is no brand glow: a CTA
holds attention with its fill.

Focus is a 1px `--brand-focus` border plus an inset 1px ring of the same colour,
which reads as 2px without costing a pixel of layout. No halo. Selection is
`--brand` over `--brand-soft`, at constant border width — thickening a border on
selection nudges the content half a pixel in every direction.

## Components

New: `Text`, `Spinner`, `Progress` (determinate and indeterminate), `ListRow`,
`DetailList`/`DetailRow`, `Medallion`, `charts` (moved in, so a chart's
`fill="var(--primary)"` is legal).

New variants: `Card` — `default | panel | tile | row | option | note | alert`;
`Button` — `+ destructiveOutline`, `shape="pill"`, sizes back to shadcn's ladder
except `lg` at 48px; `Badge` — `+ success | warning`; `Toggle` — `+ option`, on
`data-pressed`; `Input` — `default | field | cell | bare | figure`;
`SelectTrigger` — `+ field`; `Skeleton` — `shape`; `Avatar` — `+ xl`.

Sizes: fields and toggles 44px, the CTA 48px. shadcn's 36/40 ladder is right for
a dense desktop app and too small for the one button a thumb has to find.

## Migration order, if this is ever done again

Additive first, destructive last, so every commit builds: new tokens beside the
old → `ui/**` variants → call sites → the vendored edges → delete the
transitional layers → the lint rule → docs. Writing the new `globals.css` first
and fixing call sites afterwards leaves the tree broken in between.

## Traps

- **Turbopack does not invalidate `@theme`.** A new token is served from the
  cache in `.next` even after a dev-server restart. `rm -rf frontend/.next`. A
  production build is always right — if a colour "didn't arrive", suspect the
  cache before the code.
- **`shadcn add` owns `ui/` by filename.** A registry component called `text.tsx`
  would overwrite ours.
- **Import order in `globals.css` is load-bearing:** `shadcn/tailwind.css` after
  `tw-animate-css`, or Base UI's accordion keyframes lose
  `--accordion-panel-height`.
- **A missing token yields no CSS, not a default.** Deleting a token silently
  removes the rule that used it.

## Historical

`foodnote-design-summary.md` documents the Paper design system this started from.
It is a **historical reference for brand intent** — the fonts, the mascot, the
hues — and no longer the source of truth for values: its type scale declared
`title` 15px under `body` 16px, which is why nobody used it.
The newer reference is the designer's HTML handoff, adopted as direction and
kept outside the repository — ask Sergey for the package.
