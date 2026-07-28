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
