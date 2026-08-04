# Styling spec: the tokens, the type row, the rule

The reasoning is in [ADR 0010](../adr/0010-values-come-from-the-theme.md), and
what the previous system cost is in
[ADR 0009](../adr/0009-visual-style-lives-in-components.md). This is the
reference: what exists, what it is for, and what is not allowed.

## The rule

**A value comes from the theme. A utility built from a theme value is legal
anywhere** — in `ui/**`, in a page, in a component. There is no boundary to keep
on the right side of.

Two things are errors, enforced by `frontend/eslint-rules/no-literal-values.js`
at `error` over `src/**`:

1. **A colour literal anywhere in a `.tsx`** — `#hex`, `rgb()`, `hsl()`,
   `oklch()`. In a class, a plain string, a `style={{}}`, a chart prop. Colour
   comes from `:root`, or from `color-mix()` on something that does.
   `color-mix(in oklch, …)` names the space, not a colour, and passes.
2. **An arbitrary value in a visual group (`text-`, `font-`, `leading-`,
   `tracking-`, `bg-`, `border-`, `shadow-`, `rounded-`, `ring-`, `fill-`,
   `stroke-`, …) that references no token.** `text-[13px]`, `rounded-[32px]` and
   `shadow-[0_1px_2px_rgba(0,0,0,.04)]` are errors;
   `rounded-[calc(var(--radius)-5px)]` and `bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]`
   are not — a literal inside `calc()` adjusts a token rather than replacing it.

Not values, and not touched: layout (`w-[137px]`, `grid-cols-[1fr_auto]`),
variants (`data-[state=open]:`, `has-[…]`, `group-data-[…]`), motion, casing,
figure style.

`*_CLASS` constants remain an error — a shared class string is a component
variant nobody wrote. A `*ClassName` prop is fine, since passing `className`
through is how registry components compose; a component that needs a styled part
should still take the element: `trigger={<Button …/>}`.

**Two scoped exceptions**, both deliberate:

- `src/components/ui/**` may hold an **untokenised length** (`ring-[3px]`, the
  tooltip arrow's `rounded-[2px]`) because upstream ships them and these files
  are kept diffable. Colour literals and hardcoded type are still errors there.
- `marketing/**`, `canvasui/**` and `evilcharts/**` are excluded entirely. Three
  separate visual systems, ~7800 lines; `marketing/**` alone holds 34 literals
  that are its own palette. They stay under every other check.

## Colour roles

35 values in `:root`, and only six names are not stock shadcn: `--brand-ink`,
`--success`, `--warning` and the three `*-text` weights. All values are oklch —
`color-mix(in oklch, …)` and `/opacity` are only predictable there, so states
and washes are derived rather than held as tokens.

| Role                                                     | For                                                             |
| -------------------------------------------------------- | --------------------------------------------------------------- |
| `--background`                                           | the page                                                        |
| `--foreground`                                           | all primary text (13.9:1)                                       |
| `--card`, `--popover` (+ `-foreground`)                  | surfaces                                                        |
| `--primary`                                              | the brand **fill**: CTA, mascot, mesh, the chart arc            |
| `--primary-foreground`                                   | its label — white, 2.0:1, the one exception below               |
| `--secondary`, `--accent` (+ `-foreground`)              | button surface, warm wash                                       |
| `--muted`, `--muted-foreground`                          | a passive surface; secondary text (5.3:1)                       |
| `--border`, `--input`                                    | structure                                                       |
| `--ring`                                                 | focus — warm, not the fill, and 3:1 against both surfaces       |
| `--destructive`                                          | error and over-target                                           |
| `--brand-ink`                                            | brand **text**: links, active nav, an emphasized figure (5.0:1) |
| `--success`, `--warning`                                 | "on plan" and "worth a look" — fills, borders, icons            |
| `--success-text`, `--warning-text`, `--destructive-text` | text on the matching wash                                       |
| `--chart-1..5`                                           | decoration: 1 the brand orange, 2 mint, 3 coral, 4–5 unused     |
| `--mascot-canvas`                                        | the cream the mascot artwork is painted on — see below          |
| `--sidebar-*`                                            | compatibility shims `shadcn add sidebar` greps for              |

**Brand and text is the one rule worth memorising:** the brand hue fills and
does not _become_ text unless it is `--brand-ink`. On white, `#f5a65c` reads
2.0:1 and `#e08a3c` 2.67:1, against a 4.5:1 threshold.

**The one deliberate exception, and the only one.** A filled button's label is
**white on `#f5a65c` at 2.00:1** — below the 4.5:1 every other pair here meets.
It was the app's own ink at 7.3:1 until the team asked for white on review of
#106, with the number on the table. The alternative was measured too: white
earns its 4.5:1 once the fill drops to `oklch(0.577 0.13 62.2)` (`#ae6508`), and
that was rejected as too brown to be the brand. So `--primary` keeps the
handoff's orange and `--primary-foreground` is white. Treat this as a decision
the team owns rather than a defect to fix, and do not cite it as precedent: the
threshold still holds everywhere else, including `--brand-ink`, which exists
precisely so brand-coloured _text_ has something that passes.

## The second appearance

`light | dark | system`, chosen rather than derived —
[ADR 0014](../adr/0014-a-second-appearance-is-chosen-not-inverted.md) argues the
shape. What matters for the palette: of the 35 declarations in `:root`, 11 are
`var()` aliases and resolve at use time, and `--primary` keeps one value in both
appearances (its _label_ flips instead). So the dark set is **23 chosen values**,
none of them a transform of its light counterpart.

Two rules hold across all of them: every surface stays at or below **chroma
0.015** — warmth comes from hue, the lesson the light background learned when its
own chroma was halved — and `--card` stays lighter than the page, by 0.043 rather
than light's 0.018, because the same step is invisible down there and on a dark
surface that separation is what carries elevation.

The donut's four hues are held at least 45° apart pairwise, since they are drawn
at once with sectors touching. The coral moved from hue 31 to 14 to earn that
against the brand orange at 62. `--chart-5` has no dark value: nothing uses it.

### Measured pairs

Both appearances, computed from `globals.css` by `globals.spec.ts`, which fails
below 4.5:1 for text and 3:1 for a focus ring. Numbers, not intentions.

| Pair                                   | light | dark  |
| -------------------------------------- | ----- | ----- |
| `--foreground` on `--background`       | 13.88 | 15.25 |
| `--foreground` on `--card`             | 14.62 | 13.70 |
| `--foreground` on `--secondary`        | 14.04 | 12.91 |
| `--foreground` on `--muted`            | 13.31 | 12.23 |
| `--foreground` on `--accent`           | 13.21 | 11.21 |
| `--muted-foreground` on `--background` | 5.40  | 7.21  |
| `--muted-foreground` on `--card`       | 5.69  | 6.47  |
| `--brand-ink` on `--background`        | 5.02  | 10.97 |
| `--brand-ink` on `--card`              | 5.28  | 9.86  |
| `--primary-foreground` on `--primary`  | 2.00  | 7.30  |
| `--success-text` on `--card`           | 7.54  | 9.65  |
| `--warning-text` on `--card`           | 5.86  | 10.01 |
| `--destructive-text` on `--card`       | 5.66  | 6.82  |
| `--destructive` on `--card`            | 5.45  | 5.63  |
| `--destructive` on `--background`      | 5.17  | 6.26  |
| `--ring` on `--background`             | 3.23  | 7.03  |
| `--ring` on `--card`                   | 3.41  | 6.31  |
| `--primary` on `--background`          | 1.90  | 8.95  |
| `--brand-ink` on `--foreground`        | 2.77  | 1.39  |

Two of those are below their threshold, both in light, and each is pinned to the
measured number in the test so it cannot drift:

- **`--primary-foreground` on `--primary`, 2.00** — the #106 decision above. Dark
  reaches 7.30 by flipping the label, so the exception exists in light only.
- **`--primary` on `--background`, 1.90** — the fill's own edge against the page.
  A solid button names itself with its label, and darkening the fill to earn the
  ratio is the #106 argument over again.

`--ring` was a third entry until it was re-picked. It had been chosen to improve
on the fill's 2.0:1 and measured _lower_ than it — 1.84 and 1.94 — so it now sits
at `oklch(0.648 0.15 58.7)`: 3.23 and 3.41, the lightest value at its own hue that
clears the criterion, with the chroma raised as it darkened so it stays amber
rather than brown.

One pair is worth knowing and is not a threshold failure: **`--brand-ink` on
`--foreground`, 2.77 in light and 1.39 in dark** — a link's colour against body
text, where 3:1 is the recognised target because the `link` variant underlines on
hover only. Neither appearance reaches it; dark is thinner by construction, since
the ink sits above the fill (ADR 0014 argues that trade).

**`--mascot-canvas` is not a surface.** `default.webp` and `guide.webp` are
opaque squares whose ink runs to all four edges — measured: the ears sit 8% from
the top, outside an inscribed circle, and the body reaches the bottom edge. So a
circular crop always eats something. The token is the artwork's own background
(`rgb(252 250 246)`), which lets a disc be drawn in exactly that colour with the
square _inscribed_ in it — side ≤ diameter ÷ √2 — so the square's edges land on
their own colour and vanish, and the mascot gets air instead of a rim. It is the
one colour that does **not** change between appearances: the illustration does
not, so its ground cannot.

**Washes are derived, not stored.** `--success-surface` and friends were deleted
in favour of `color-mix(in oklch, var(--success), var(--card) 90%)`, which
measures 5.98:1 (success), 5.63:1 (warning) and 8.29:1 (destructive) for the
matching `*-text` on its own wash. The `*-text` weights stayed tokens on purpose:
a bare call site has no component to derive one inside, and
`text-[color-mix(…)]` in markup is worse than a name.

## Type

Tailwind's own row. No semantic scale, no `<Text>`, nothing to register with
`tailwind-merge`. A level is a size class with a weight beside it, written where
it is used.

| Role, as it used to be named | Now                                          |
| ---------------------------- | -------------------------------------------- |
| `overline`                   | `text-xs font-bold tracking-wider uppercase` |
| `caption`, `body`            | `text-sm`                                    |
| `label`                      | `text-sm font-semibold`                      |
| a **section** heading        | `text-sm font-semibold` on the `<h2>`        |
| a **card** heading           | `text-base font-semibold`                    |
| `title` (drawer, dialog)     | `text-lg font-bold`                          |
| `heading` (page title)       | `font-heading text-2xl font-semibold`        |
| `display` (a large figure)   | `font-heading text-4xl font-semibold`        |

`caption` and `body` landing on the same utility is not an oversight: they were
13 and 15 and the difference never carried meaning — weight and colour did.
Text moves 1–2px from the handoff at several sizes, and that was accepted on
screen rather than by argument.

Three things to know:

- **Two families: Figtree and Fredoka.** `--font-heading` is Fredoka, applied
  **explicitly** at roughly a dozen display-scale call sites. A heading's rank
  does not imply a face — an `h2` reading "Current plan" is not in Fredoka, and
  the figure under it is.
- **Fields keep `text-base md:text-sm`.** 16px on mobile is what stops iOS
  Safari zooming on focus. A platform constraint, not a preference.
- **`tabular-nums` on any figure that animates or sits in a column.**
  Proportional digits jitter as a counter runs.

## Radius, elevation, focus

One root: `--radius: 16px`, with shadcn's own formula — `sm/md/lg/xl` at
−4/−2/0/+4, so 12/14/16/20. Controls take `md`, cards and drawers `xl`. It must
stay a **length**: `input-group` computes `calc(var(--radius) - 5px)` from it.

Elevation is tailwind's `shadow-xs/sm/md/lg` and nothing of ours; the heaviest
shadow the handoff asks for is roughly `shadow-lg`. No brand glow — a CTA holds
attention with its fill — and no focus halo, which reads as a smudge where the
border already says it.

Focus and invalid are the same shape on every field: `border-ring` plus
`ring-1 ring-ring ring-inset`, and the same in `--destructive` for
`aria-invalid`. Inset, so it reads as a 2px edge with the border and costs no
layout — no halo, which reads as a smudge where the border already carries the
state. `Textarea` is where this is written out; `Input`, `SelectTrigger` and
`InputGroup` follow it, and `InputGroup` draws it on the group rather than on
the control it wraps. Buttons and toggles keep upstream's 3px at `/50`: they are
not fields, and a pressed toggle needs the softer edge to stay legible.

## Components

`ui/**` is 25 files, all of them registry components. Nothing style-only lives
there: `Text`, `ListRow`, `DetailList`, `Medallion` and `Badge` were deleted once
their call sites moved. Components that _draw_ rather than style — `gauge`,
`sparkles`, `shield-check`, `charts` — are in `components/`.

Variants are exactly upstream's. `cta`, `quiet`, `pill`, `size="inline"`, the
seven `Card` variants, the five `Input` variants, `field`/`cell` on `InputGroup`
and `SelectTrigger` are gone; the look that was a variant is written at the call
site that wanted it. The named divergences from upstream are listed in ADR 0010 —
touch targets, `Card`'s border, `link` on `brand-ink`, dropped `dark:` rules.

`PasswordInput` is not a wrapper to delete: it reaches the login form and the
profile dialog through `app/(auth)/auth-text-field.tsx` as `InputComponent`,
which is why a search for `<PasswordInput` finds nothing.

## Migration order, if this is ever done again

Additive first, destructive last, so every commit builds: **tokens beside the old
ones → `ui/**` back to upstream → call sites, one screen per commit → delete the
wrappers → delete the tokens nothing reads → the lint rule → the docs.**

Two hard-won details:

- A wrapper can only go once the compiler can prove nothing imports it. Deleting
  it earlier leaves the tree broken in between, which is how the previous rewrite
  went wrong.
- Deleting a variant is a type error at every call site that passed it, so those
  call sites move in the same commit or the branch stops building — 55 of them
  did, in one commit.

## Traps

- **Turbopack does not invalidate `@theme`.** A changed token is served from
  `.next` even after a dev-server restart. `rm -rf frontend/.next`. If a colour
  "didn't arrive", suspect the cache before the code.
- **A missing token yields no CSS, not a default.** This is the single most
  expensive fact in this document. Deleting a token silently removes the rule
  that used it — four files once rendered with _no_ colour rule rather than the
  wrong one, and three `ui/` files nearly lost their type the same way.
- **A token name can be held as a string.** `goal-reached-overlay.tsx` resolves
  token names through `getComputedStyle` to paint a canvas. No class rewrite and
  no type error will find that; grep for the name.
- **`shadcn add` owns `ui/` by filename.** A registry component called `text.tsx`
  would overwrite ours.
- **Import order in `globals.css` is load-bearing:** `shadcn/tailwind.css` after
  `tw-animate-css`, or Base UI's accordion keyframes lose
  `--accordion-panel-height`.

## Historical

`foodnote-design-summary.md` documents the Paper design system this started
from — a **historical reference for brand intent** (fonts, mascot, hues), not a
source of values: its type scale declared `title` 15px under `body` 16px, which
is why nobody used it. The newer reference is the designer's HTML handoff,
adopted as direction and kept outside the repository — ask Sergey for the package.
