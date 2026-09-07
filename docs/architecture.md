# Architecture

## Overview

IT Risk Management System is a full-stack GRC (Governance, Risk & Compliance) platform for
identifying, assessing, and treating IT risks, with a bilingual (English/Arabic, RTL/LTR) React
frontend on top of a NestJS + PostgreSQL backend. It is implemented as an **npm workspaces
monorepo**:

```
apps/
  api/       NestJS + TypeScript backend — auth, RBAC, all domain modules, Prisma
  web/       React + TypeScript + Vite frontend — pages, i18n (EN/AR + RTL), API client
packages/
  shared/    Framework-agnostic TypeScript shared between apps (currently: risk-scoring logic)
docs/        This documentation set
```

Both `apps/api` and `apps/web` are fully implemented and wired together — the frontend
authenticates against the real API, drives every domain module through it, and is not a scaffold.
The backend also remains fully usable directly (via curl/Postman/etc.) — see
[`api-reference.md`](./api-reference.md).

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite, TanStack Query, React Router, a custom i18n/RTL context |
| Backend framework | NestJS 11 (TypeScript) |
| ORM / database | Prisma 6 + PostgreSQL 16 |
| Auth | Passport (local + JWT strategies), JWT stored in an httpOnly cookie |
| Validation | class-validator / class-transformer, via a global `ValidationPipe` |
| Security | Helmet security headers, global + per-route rate limiting, `JWT_SECRET` startup validation |
| Testing | Jest (unit tests) + Supertest (e2e scaffold) |
| Shared logic | `packages/shared` — TypeScript, built with `tsc`, consumed by `apps/api` at runtime (see [Risk scoring](#risk-scoring-the-shared-module)) |

## Backend layering

Every domain module (`assets`, `threats`, `vulnerabilities`, `risks`, `controls`,
`treatment-plans`, `users`, `audit-log`, `dashboard`) follows the same three-layer shape:

```
Controller  → HTTP routing, @Roles()/@Public() metadata, DTO binding, @CurrentUser() extraction
Service     → business rules, FK-existence checks, Prisma error translation, audit logging calls
Prisma      → PrismaService (a thin PrismaClient wrapper), injected directly — no repository layer
```

DTOs (`dto/create-*.dto.ts`, `dto/update-*.dto.ts`) declare `class-validator` constraints; the
global `ValidationPipe` (`whitelist: true, transform: true`, set in `main.ts`) rejects any request
body that doesn't satisfy them before it reaches a controller method.

## Request pipeline (global guards)

Three guards are registered as `APP_GUARD` providers and run, in order, on every request:

1. **`ThrottlerGuard`** (`AppModule`) — rate limits every route (default: 20 requests/minute per
   client); `POST /auth/login` overrides this to a stricter 5/minute via `@Throttle()`.
2. **`JwtAuthGuard`** (`AuthModule`) — verifies the JWT from the `access_token` cookie and attaches
   the authenticated `User` to the request. Skipped for routes marked `@Public()`.
3. **`RolesGuard`** (`AuthModule`) — checks the authenticated user's role against any `@Roles(...)`
   metadata on the route (class-level or method-level). A route with no `@Roles()` is open to any
   authenticated user.

See [`security.md`](./security.md) for the full authentication/authorization design.

## Risk scoring: the shared module

`packages/shared/src/risk-scoring.ts` is the single source of truth for risk scoring:

- `likelihood` and `impact` are each integers in **1–5**.
- `score = likelihood × impact` (`calculateRiskScore`).
- `level` is derived from `score` via fixed bands: **LOW** 1–4, **MEDIUM** 5–9, **HIGH** 10–16,
  **CRITICAL** 17–25 (`getRiskLevel`).

**`score` and `level` are never persisted.** The `risks` table stores only `likelihood` and
`impact`; every read path (`RisksService.findOne/findAll/create/update`, and the Dashboard's
summary/heat-map endpoints) computes `score`/`level` on the fly via `assessRisk()` from
`@itrms/shared`. This guarantees the two numbers can never drift out of sync with the scoring
rules, and that changing the scoring bands in one place (the shared package) instantly and
consistently changes every consumer.

## Modules

| Module | Responsibility |
|---|---|
| `prisma` | `PrismaService` — a global, injectable `PrismaClient` wrapper |
| `auth` | Login/logout/`me`, JWT issuance & cookie handling, Passport strategies, global guards |
| `users` | User account management (ADMIN-only) |
| `assets` | IT asset inventory, with owner-based authorization for `ASSET_OWNER` (an owner may edit an asset they own, but only `ADMIN`/`RISK_MANAGER` may reassign its ownership) |
| `threats` | Threat catalog (reference data feeding `Risk.threatId`) |
| `vulnerabilities` | Vulnerability catalog, each scoped to one asset |
| `risks` | The risk register — the core domain entity, ties asset/threat/vulnerability/owner together |
| `controls` | Control library, plus risk↔control linking (`risk_controls`) |
| `treatment-plans` | Remediation plans tied to a risk and an accountable owner |
| `audit-log` | Append-only log of every mutation across the modules above |
| `dashboard` | Read-only aggregate statistics and the 5×5 risk heat map |

## Frontend

`apps/web` is a Vite-built React 19 + TypeScript single-page app (`apps/web/src`):

```
src/
  api/       fetch-based client (client.ts: credentials:'include', typed ApiError) + per-resource endpoints (resources.ts)
  auth/      AuthContext (current user, login/logout), RouteGuards (RequireAuth, RequireRole)
  components/  layout (Sidebar, Topbar, AppLayout), ui/ (Button, Modal, DataTable, form, ...), dashboard/ (charts, heat map)
  i18n/      LocaleContext + translations/ (see below)
  pages/     one page per route (Dashboard, Risks, Threats, Vulnerabilities, Controls, Assets, TreatmentPlans, Users, AuditLogs, Login, Forbidden, NotFound)
  hooks/     resource hooks built on TanStack Query
  types/     TypeScript types mirroring the API's request/response shapes
```

**Data flow / state:** all server data goes through **TanStack Query** (`@tanstack/react-query`) —
each domain has a small set of hooks in `hooks/resources.ts` (e.g. `useRisks`, `useCreateRisk`)
wrapping the typed `api` client in `api/resources.ts`. Mutations invalidate the relevant query keys
on success so lists refresh automatically; there is no separate global client-state store (Redux,
Zustand, etc.) — TanStack Query's cache *is* the client-side data layer. `AuthContext` (backed by a
`GET /auth/me` query) is the one piece of state outside that pattern, since it gates routing.

**Routing:** `react-router-dom`, defined in `App.tsx`. `RequireAuth` redirects to `/login` when
`GET /auth/me` fails; `RequireRole` (used on `/users` and `/audit-logs`) redirects to `/forbidden`
for a role that doesn't have server-side access to that page either — the frontend guard is a UX
convenience, the same restriction is always enforced again at the API (see
[`security.md`](./security.md)).

**Bilingual i18n / RTL:** `i18n/LocaleContext.tsx` is a small custom provider (no external i18n
library) exposing `t(key)` for translated strings and `enumLabel(category, value)` for translating
backend enum *values* (risk levels, statuses, categories, roles, etc.) at the presentation layer
only — the raw enum strings sent to and received from the API are never translated or altered.
`i18n/translations/en.ts` and `ar.ts` hold every UI string as a single source of truth (TypeScript
enforces both locales have the exact same key shape); the selected locale persists in
`localStorage`. Switching to Arabic sets `dir="rtl"`/`lang="ar"` on `<html>`; layout mirroring
relies on CSS logical properties (`ps-`/`pe-`/`ms-`/`me-`/`text-start`/`text-end` instead of
physical `pl-`/`pr-`/`text-left`) and native flexbox/grid direction-awareness, not manually reversed
text. Dates are formatted per-locale via `Intl` with an explicit locale (`en-US` / a Gregorian-
calendar-pinned Arabic locale) rather than relying on the browser's ambient locale.

## Deliberately deferred / out of scope

The following were explicitly excluded from the approved MVP scope and were never implemented:
refresh-token rotation, Redis, background job queues, notifications, file attachments, PDF export,
and compliance-framework mapping (e.g. ISO 27001 / NIST control mapping). See
[`security.md`](./security.md) and the main [README](../README.md) for more on project status.
