# Setup Guide

## Prerequisites

- Node.js **22+** (see `.nvmrc`)
- Docker (for the provided `docker-compose.yml` PostgreSQL instance) — or any PostgreSQL 16
  instance you already have reachable

## 1. Install dependencies

```bash
npm install
```

This installs all three workspaces (`apps/api`, `apps/web`, `packages/shared`) from the repo root.

## 2. Configure environment variables

```bash
cp .env.example .env                    # root — used by docker-compose
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env   # optional — same value as the built-in default (see below)
```

Adjust values as needed — see [`environment-variables.md`](./environment-variables.md) for what
each one does. At minimum, `apps/api/.env`'s `DATABASE_URL` must match whatever Postgres instance
you use.

## 3. Start PostgreSQL

```bash
docker compose up -d
```

Or point `DATABASE_URL` at any PostgreSQL 16 instance you already have running.

## 4. Build the shared package

`apps/api` imports `@itrms/shared` at both compile time and runtime, so it must be built first
(the root `build`/`test` scripts already do this automatically — see step 6/7):

```bash
npm run build -w packages/shared
```

## 5. Apply migrations and seed demo data

```bash
cd apps/api
npx prisma migrate deploy   # or `npx prisma migrate dev` on a fresh dev database
npm run prisma:seed
```

The seed script is **idempotent** — safe to re-run. See the root [README](../README.md#demo-login)
for the demo login credentials it creates and what it seeds.

## 6. Run the backend

```bash
npm run dev:api        # from the repo root — hot-reload dev server
# or, from apps/api:
npm run start:dev
```

The API listens on `http://localhost:3000` by default (`PORT` in `apps/api/.env`).

## 7. Run the frontend

```bash
npm run dev:web         # from the repo root
```

This starts the Vite dev server for the full React application UI at **`http://localhost:5173`**.
Open it in a browser and log in with one of the demo accounts (see the root
[README](../README.md#demo-login)) to use the app — Dashboard, Risk Register, Assets, Threats,
Vulnerabilities, Controls, Treatment Plans, Users, and Audit Logs, in English or Arabic (RTL).

## Everyday development commands (from the repo root)

| Command | What it does |
|---|---|
| `npm run lint` | ESLint across the whole monorepo (`--fix` for apps/api, check-only elsewhere) |
| `npm run format` / `npm run format:check` | Prettier write / check |
| `npm run build` | Builds `packages/shared` first, then every workspace |
| `npm run test` | Builds `packages/shared`, then runs Jest in every workspace that has a `test` script |
| `npm run dev:api` / `npm run dev:web` | Hot-reload dev servers |

From `apps/api` specifically:

| Command | What it does |
|---|---|
| `npm run test:e2e` | Runs the e2e Jest suite (`test/*.e2e-spec.ts`) — requires a reachable database |
| `npm run test:cov` | Unit tests with a coverage report |
| `npm run prisma:studio` | Opens Prisma Studio against `DATABASE_URL` |
| `npm run prisma:migrate:dev` | Creates/applies a new migration in development |
| `npm run prisma:migrate:deploy` | Applies existing migrations (production-style, non-interactive) |
| `npm run prisma:seed` | Runs `apps/api/prisma/seed.ts` (idempotent demo data) |

## Troubleshooting

- **`PrismaClientInitializationError: Can't reach database server`** — PostgreSQL isn't reachable
  at `DATABASE_URL`. Confirm `docker compose ps` shows the container healthy, or that your own
  Postgres instance is running and the connection string is correct.
- **`Cannot find module '@itrms/shared'`** — `packages/shared` hasn't been built yet. Run
  `npm run build -w packages/shared`, or just use the root `npm run build` / `npm run test`
  scripts, which do this automatically.
- **Jest picks up a stale transform / unrelated syntax errors** — clear the Jest cache:
  `npx jest --clearCache` (run from `apps/api`).
