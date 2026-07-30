# FoodNote

Calorie-tracking capstone. npm-workspaces monorepo:

- `frontend/` — Next.js App Router + Tailwind, port 3000
- `backend/` — NestJS API (TypeORM + PostgreSQL), port 3001, routes under `/api`
- `shared/` — `@foodnote/shared` Zod schemas, the API contract for both apps

## Commands

- `npm run dev` — shared (watch) + backend + frontend
- `npm test` / `npm run format:check` — must pass before a PR
- `npm run db:up` — start local Postgres 16 (Docker, waits for healthy); `db:down` / `db:logs` to stop / tail

## Rules

- `main` only via PR; branches reference a ticket: https://github.com/users/valentyn-vb/projects/5/views/1
- API request/response shapes live in `shared/` — never duplicate them in an app
- `CONTEXT.md` is the domain glossary (the ubiquitous language) — use its terms in code, tests, and docs, and update it when the model changes; architectural decisions are recorded in `docs/adr/`
- adding, removing, or changing an endpoint means updating the OpenAPI docs (`backend/src/docs/openapi.ts`, served at `/api/docs`) in the same change — schemas come from `shared/`, so only the route wiring needs a new entry
- every form — including a single field inside a drawer or dialog — follows **Forms** below

## Forms

The frontend is shadcn `base-vega` on Base UI (`frontend/components.json`; check with `npx shadcn@latest info -c frontend`). Add components with `npx shadcn@latest add <name> -c frontend` — never hand-write a file into `components/ui/`.

**State and validation.** `useForm` from `react-hook-form` with `zodResolver(schema)`, and `<form onSubmit={form.handleSubmit(onSubmit)} noValidate>` — `noValidate` because Zod owns the messages, not the browser. The schema comes from `shared/`; derive it with `.omit()` / `.pick()` / `.extend()` when the form's shape differs from the request body (see `mealFormSchema` in `manual-meal-form.tsx`). Never `useState` for a field value plus a manual `safeParse`, a regex `onChange` filter, or a bespoke error string. Field-level server errors go back through `form.setError('email', …)`; everything else is a `toast.error`.

**Structure.** This project has no `ui/form.tsx` — the Base UI style uses the `field` primitives instead, so there is no `<Form>` / `<FormField>` / `<FormMessage>`. Don't install the Radix ones. Compose:

- `FieldGroup` wraps the form's fields and owns the vertical rhythm — don't put `gap-*` or `space-y-*` on the `<form>` to space fields
- one `Field` per input: `FieldLabel` (with `htmlFor`) → the control → `FieldError`, in that order, with `FieldDescription` for helper text
- `FieldSet` + `FieldLegend` for a group that reads as one question (radio/checkbox sets), not a bare `FieldLabel` over loose inputs
- invalid state is declared twice, by design: `data-invalid` on the `Field` (drives `data-[invalid=true]:text-destructive` across label and message) and `aria-invalid` on the control itself (drives the control's own ring). Setting only one gives a half-styled error
- controls that aren't native inputs — `ToggleGroup`, `Select`, `RadioGroup` — bind through `Controller`, never `register()`
- styling follows **Styling** below

## Styling

Tailwind v4, tokens in `@theme` in `frontend/src/app/globals.css`. **All visual
style lives inside `frontend/src/components/ui/**` as component variants.
Outside it, only layout.** See
[ADR 0009](docs/adr/0009-visual-style-lives-in-components.md) for why, and
[the spec](docs/design/styling-rewrite-spec.md) for the tokens, the levels and
the component APIs.

- **Forbidden outside `ui/**`:** colour, background, font size and weight,
  radius, shadow, border. **Allowed:** layout, sizing, alignment and wrapping,
  casing, figure style, motion. `frontend/eslint-rules/no-visual-classes.js`
  enforces this at `error` and names the replacement in the message. It is an
  allow-list, so a tailwind utility nobody has classified yet is forbidden by
  default — that is deliberate, and widening it is a decision, not a fix.
- **Text gets its type from a level, never a class:** `<Text variant="label"
tone="muted">`. A level sets size, line-height, weight and family at once, so
  there is no `size` prop to combine with it. `render` swaps the element when the
  level and the heading rank disagree.
- **Never export a className string.** A look shared by two call sites is a `cva`
  variant on the `ui/` component, so callers write `<Card variant="tile">`. Five
  such constants have been deleted from this repo, one of them written a day
  after four others were — the lint rule now rejects any `*_CLASS` identifier.
- **A `*ClassName` prop is the same hole with a different name.** A component
  that needs a styled trigger takes the element: `trigger={<Button …/>}`.
- **Cancelling a `ui/` component's own defaults is the tell.** When a call site
  fights the component, the variant belongs _in_ the component.
- **No arbitrary value that hardcodes a colour or an elevation.** If the value is
  missing, add the token to `@theme` and use the generated utility. Note that a
  _missing_ token yields no CSS at all rather than a default, so deleting one
  silently removes the rule that used it.
- **Register any new type level with `tailwind-merge`** in `frontend/src/lib/utils.ts`.
  `text-*` is both a size and a colour group; an unregistered level is treated as
  a colour, collides with the colour beside it, and is dropped. This silently ate
  the previous type scale.
- **Don't re-implement reduced motion.** `globals.css` collapses every CSS
  animation and transition under `prefers-reduced-motion: reduce`, app-wide. Two
  exceptions: motion driven from JS must check the preference at its source, and
  motion that _is_ the information — a busy indicator — needs an explicit
  exemption alongside the existing ones.
- **There is no dark mode.** It was removed, not disabled: no `.dark`, no
  `dark:`, no `next-themes`. Adding one back is a design effort, not a token pass.
- **After changing `@theme`, `rm -rf frontend/.next`.** Turbopack serves stale
  token CSS even across a dev-server restart, and a colour that "didn't arrive"
  is the cache far more often than the code.
