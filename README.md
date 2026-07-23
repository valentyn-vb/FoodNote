# FoodNote

Weight-loss planning and calorie tracking with AI-assisted meal logging.

Capstone project demonstrating: Node.js, NestJS, Next.js, PostgreSQL (TypeORM), Docker, GitHub Actions.

**Ticket board:** https://github.com/users/valentyn-vb/projects/5/views/1

## Structure

npm workspaces monorepo:

| Folder      | What it is                                                              |
| ----------- | ----------------------------------------------------------------------- |
| `frontend/` | Next.js (App Router) + TypeScript + Tailwind — port **3000**            |
| `backend/`  | NestJS + TypeScript API — port **3001**, all routes under `/api`        |
| `shared/`   | `@foodnote/shared` — Zod schemas shared by both apps (the API contract) |

## Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL)

## Setup

```bash
npm install            # installs all three workspaces
cp .env.example .env   # local configuration
npm run db:up          # PostgreSQL 16 on localhost:5432 (Docker; waits for healthy)
npm run dev            # shared (watch) + backend (3001) + frontend (3000)
```

Open http://localhost:3000 — the page shows live backend status via `GET /api/health`.

Browse the API at http://localhost:3001/api/docs (Swagger UI); the raw OpenAPI spec is at http://localhost:3001/api/openapi.json.

## Working rules

- `main` is protected: changes land via pull request with at least one review.
- Branches are short-lived (max 2 days) and reference a ticket from the board.
- Secrets live in `.env` only (git-ignored); `.env.example` documents every variable.
