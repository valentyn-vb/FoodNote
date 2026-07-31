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

| Role                                                     | For                                                                   |
| -------------------------------------------------------- | --------------------------------------------------------------------- |
| `--background`                                           | the page                                                              |
| `--foreground`                                           | all primary text (13.6:1)                                             |
| `--card`, `--popover` (+ `-foreground`)                  | surfaces                                                              |
| `--primary`                                              | the brand **fill**: CTA, mascot, mesh, the chart arc                  |
| `--primary-foreground`                                   | its label — the app's own ink, 7.3:1                                  |
| `--secondary`, `--accent` (+ `-foreground`)              | button surface, warm wash                                             |
| `--muted`, `--muted-foreground`                          | a passive surface; secondary text (5.3:1)                             |
| `--border`, `--input`                                    | structure                                                             |
| `--ring`                                                 | focus — warm, but not the fill: the fill is 2.0:1 where 3:1 is wanted |
| `--destructive`                                          | error and over-target                                                 |
| `--brand-ink`                                            | brand **text**: links, active nav, an emphasized figure (4.9:1)       |
| `--success`, `--warning`                                 | "on plan" and "worth a look" — fills, borders, icons                  |
| `--success-text`, `--warning-text`, `--destructive-text` | text on the matching wash                                             |
| `--chart-1..5`                                           | decoration: 1 the brand orange, 2 mint, 3 coral, 4–5 unused           |
| `--sidebar-*`                                            | compatibility shims `shadcn add sidebar` greps for                    |

**Brand and text is the one rule worth memorising:** the brand hue fills and
carries dark text; it does not _become_ text unless it is `--brand-ink`. On
white, `#f5a65c` reads 2.0:1 and `#e08a3c` 2.67:1, against a 4.5:1 threshold.

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

Focus is `--ring`: a border plus a 3px ring at `/50`, upstream's own treatment.

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
