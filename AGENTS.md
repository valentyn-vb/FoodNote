# FoodNote

Calorie-tracking capstone. npm-workspaces monorepo:

- `frontend/` — Next.js App Router + Tailwind, port 3000
- `backend/` — NestJS API (TypeORM + PostgreSQL), port 3001, routes under `/api`
- `shared/` — `@foodnote/shared` Zod schemas, the API contract for both apps
- `e2e/` — the Playwright smoke net. Its own workspace rather than `frontend/e2e/`:
  it boots Postgres, Nest **and** a Next build, so it belongs to all three

## Commands

- `npm run dev` — shared (watch) + backend + frontend
- `npm test` / `npm run format:check` — must pass before a PR
- `npm run db:up` — start local Postgres 16 (Docker, waits for healthy); `db:down` / `db:logs` to stop / tail
- `npm run test:e2e` — the smoke net. Needs Docker; creates the `foodnote_e2e`
  database, builds `shared` and `backend`, seeds a fresh account for the run,
  then starts both servers itself. Deliberately outside `npm test`: the default
  test command should not require Docker and a production build, or it stops
  being run locally

## Rules

- `main` only via PR; branches reference a ticket: https://github.com/users/valentyn-vb/projects/5/views/1
- API request/response shapes live in `shared/` — never duplicate them in an app
- `CONTEXT.md` is the domain glossary (the ubiquitous language) — use its terms in code, tests, and docs, and update it when the model changes; architectural decisions are recorded in `docs/adr/`
- adding, removing, or changing an endpoint means updating the OpenAPI docs (`backend/src/docs/openapi.ts`, served at `/api/docs`) in the same change — schemas come from `shared/`, so only the route wiring needs a new entry
- every form — including a single field inside a drawer or dialog — follows **Forms** below
- comment only what the code can't say: a constraint, a measured value, a decision that reads as a mistake. Never restate the line below it, and don't narrate a change — that belongs in the commit

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

Tailwind v4, tokens in `@theme` in `frontend/src/app/globals.css`. **A value
comes from the theme; a utility built from a theme value is legal anywhere.**
There is no `ui/**` boundary — that was [ADR
0009](docs/adr/0009-visual-style-lives-in-components.md), superseded by [ADR
0010](docs/adr/0010-values-come-from-the-theme.md), which says what it cost. The
tokens, the type row and the named divergences from upstream are in
[the spec](docs/design/styling-rewrite-spec.md).

- **Write utilities, not variants:** `<h2 className="text-sm font-semibold">`,
  not a level, a tone or a `<Text>`. There is no semantic type scale and no
  `Text` component; the row is tailwind's own, with a weight class beside it.
- **What is forbidden is a literal.** `frontend/eslint-rules/no-literal-values.js`
  errors on a colour literal (`#hex`, `rgb()`, `oklch()`) **anywhere in a
  `.tsx`** — including inside `style={{}}` and a chart prop — and on an arbitrary
  value in a visual group that references no token. So `text-[13px]` and
  `shadow-[0_1px_2px_rgba(0,0,0,.04)]` are errors, and
  `rounded-[calc(var(--radius)-5px)]` and `bg-[color-mix(in_oklch,var(--card),var(--foreground)_5%)]`
  are not. Layout and variants (`data-[state=open]:`, `has-[…]`) are untouched.
- **If the value you need isn't there, add the token** to `@theme` and use the
  generated utility. A _missing_ token yields no CSS at all rather than a
  default, so deleting one silently removes the rule that used it — and a token
  name can be held as a string (`goal-reached-overlay.tsx` resolves several
  through `getComputedStyle`), where no type error will find it.
- **`ui/**` holds only what `shadcn add` brought,** at upstream's variants. Add
  components with `npx shadcn@latest add <name> -c frontend`, never by hand. A
  component that _draws_ rather than styles goes in `components/`. Don't invent a
  variant: write the look at the call site that wants it.
- **Never export a className string.** A look shared by two call sites is a
  component, not a constant. Five such constants were deleted from this repo, one
  written a day after four others were — the lint rule rejects any `*_CLASS`
  identifier. A component that needs a styled part takes the element:
  `trigger={<Button …/>}`.
- **Two families, and Fredoka is explicit.** `font-heading` is applied at
  display-scale call sites — a page title, a large figure. A heading's rank does
  not imply a face: an `h2` of running text is not in Fredoka.
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
