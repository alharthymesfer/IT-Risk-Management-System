# API Reference

Base URL: `http://localhost:3000` (configurable via `PORT`). All API routes are served under the
`/api` prefix (`app.setGlobalPrefix('api')` in `main.ts`) — every path in this document is relative
to that prefix (e.g. `/auth/login` below means `/api/auth/login`). Everything outside `/api` serves
the built frontend SPA (`ServeStaticModule` in `app.module.ts`), so the app and API share one origin
in production.

## Conventions

- **Auth**: cookie-based. `POST /auth/login` sets an httpOnly `access_token` cookie; every
  subsequent request must send that cookie (`credentials: 'include'` in `fetch`, or a cookie jar in
  curl/Postman). There is no `Authorization: Bearer` header support.
- **Roles**: `ADMIN`, `RISK_MANAGER`, `ASSET_OWNER`, `AUDITOR`, `VIEWER`. A route with no role
  restriction listed below is open to **any authenticated role**. `@Public()` routes need no
  authentication at all.
- **Validation errors** → `400 Bad Request` (invalid/missing DTO fields, or an FK referencing a
  row that doesn't exist).
- **Not found** → `404 Not Found`.
- **Forbidden** → `403 Forbidden` (role check failed) or a service-level ownership check throwing
  `ForbiddenException` (Assets only — see below).
- **Conflict** → `409 Conflict` (unique constraint, e.g. duplicate email; or a delete blocked by a
  foreign-key reference from another row).
- **Unauthenticated** → `401 Unauthorized`.
- Successful `DELETE` and the Controls link/unlink endpoints return `204 No Content`.
- **No pagination or filtering** on any list endpoint — `GET` collection routes return every row.
  This is a known simplification, acceptable at the current demo/portfolio data scale (see
  [`security.md`](./security.md#known-limitations)).

## Root

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/` (i.e. `/api`) | Public | API status/health payload: `{ name, status }` |

## Auth (`/auth`)

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Body: `{ email, password }`. On success, sets the `access_token` cookie and returns the safe user. Rate-limited to 5 requests/minute (stricter than the global default). |
| POST | `/auth/logout` | Public | Clears the `access_token` cookie. |
| GET | `/auth/me` | Any authenticated role | Returns the current user (no `passwordHash`). |

## Users (`/users`) — ADMIN only, every route

| Method | Path | Description |
|---|---|---|
| POST | `/users` | Create a user. |
| GET | `/users` | List all users. |
| GET | `/users/:id` | Get one user. |
| PATCH | `/users/:id` | Update a user. An admin cannot change their own role away from `ADMIN` or deactivate their own account. |
| DELETE | `/users/:id` | Delete a user. An admin cannot delete their own account; blocked (`409`) if the user still owns assets/risks/treatment plans. |

## Assets (`/assets`)

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/assets` | ADMIN, RISK_MANAGER | Create an asset (`ownerId` must reference an existing user). |
| GET | `/assets` | Any authenticated role | List all assets. |
| GET | `/assets/:id` | Any authenticated role | Get one asset. |
| PATCH | `/assets/:id` | ADMIN, RISK_MANAGER, ASSET_OWNER | Update an asset. An `ASSET_OWNER` may only update assets **they own** (service-level check; otherwise `403`). |
| DELETE | `/assets/:id` | ADMIN, RISK_MANAGER | Delete an asset. Blocked (`409`) if it still has vulnerabilities or risks referencing it. |

## Threats (`/threats`)

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/threats` | ADMIN, RISK_MANAGER | Create a threat. |
| GET | `/threats` | Any authenticated role | List all threats. |
| GET | `/threats/:id` | Any authenticated role | Get one threat. |
| PATCH | `/threats/:id` | ADMIN, RISK_MANAGER | Update a threat. |
| DELETE | `/threats/:id` | ADMIN, RISK_MANAGER | Delete a threat. Blocked (`409`) if still referenced by risks. |

## Vulnerabilities (`/vulnerabilities`)

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/vulnerabilities` | ADMIN, RISK_MANAGER | Create a vulnerability (`assetId` must reference an existing asset). |
| GET | `/vulnerabilities` | Any authenticated role | List all vulnerabilities. |
| GET | `/vulnerabilities/:id` | Any authenticated role | Get one vulnerability. |
| PATCH | `/vulnerabilities/:id` | ADMIN, RISK_MANAGER | Update a vulnerability. |
| DELETE | `/vulnerabilities/:id` | ADMIN, RISK_MANAGER | Delete a vulnerability. Blocked (`409`) if still referenced by risks. |

## Risks (`/risks`) — the risk register

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/risks` | ADMIN, RISK_MANAGER | Create a risk. Requires `assetId`, `threatId`, `ownerId` (all must exist); `vulnerabilityId` is optional but, if given, must belong to the same `assetId`. `likelihood`/`impact` are integers 1–5. |
| GET | `/risks` | Any authenticated role | List all risks, each with `score`/`level` computed on the fly. |
| GET | `/risks/:id` | Any authenticated role | Get one risk, with `score`/`level`. |
| PATCH | `/risks/:id` | ADMIN, RISK_MANAGER | Update a risk. `vulnerabilityId`: omit to leave unchanged, pass a UUID to set/change it, pass `null` to clear it. |
| DELETE | `/risks/:id` | ADMIN, RISK_MANAGER | Delete a risk (cascades to its `risk_control` links and treatment plans). |

No `ASSET_OWNER` ownership carve-out exists here (unlike Assets) — `Risk.ownerId` records
accountability, not a mutation permission.

## Controls (`/controls`) — the control library

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/controls` | ADMIN, RISK_MANAGER | Create a control. |
| GET | `/controls` | Any authenticated role | List all controls. |
| GET | `/controls/:id` | Any authenticated role | Get one control. |
| PATCH | `/controls/:id` | ADMIN, RISK_MANAGER | Update a control. |
| DELETE | `/controls/:id` | ADMIN, RISK_MANAGER | Delete a control. Blocked (`409`) if still linked to any risk. |
| GET | `/controls/:id/risks` | Any authenticated role | List the risks this control mitigates. |
| POST | `/controls/:id/risks/:riskId` | ADMIN, RISK_MANAGER | Link a control to a risk. `409` if already linked. |
| DELETE | `/controls/:id/risks/:riskId` | ADMIN, RISK_MANAGER | Unlink a control from a risk. `404` if not linked. |

## Treatment Plans (`/treatment-plans`)

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/treatment-plans` | ADMIN, RISK_MANAGER | Create a treatment plan (`riskId`, `ownerId` must exist; `status` defaults to `OPEN`). |
| GET | `/treatment-plans` | Any authenticated role | List all treatment plans. |
| GET | `/treatment-plans/:id` | Any authenticated role | Get one treatment plan. |
| PATCH | `/treatment-plans/:id` | ADMIN, RISK_MANAGER | Update a treatment plan. |
| DELETE | `/treatment-plans/:id` | ADMIN, RISK_MANAGER | Delete a treatment plan. |

## Audit Log (`/audit-logs`) — ADMIN and AUDITOR only, read-only

| Method | Path | Description |
|---|---|---|
| GET | `/audit-logs` | List every audit entry, most recent first. |
| GET | `/audit-logs/:id` | Get one audit entry. |

There is **no create/update/delete endpoint** — entries are written only as an automatic
side-effect of mutations in the other modules (see [`security.md`](./security.md)).

## Dashboard (`/dashboard`) — read-only aggregates

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/dashboard/summary` | Any authenticated role | Entity totals, risk counts by level/status/category, open & overdue treatment-plan counts. |
| GET | `/dashboard/heatmap` | Any authenticated role | The full 5×5 likelihood × impact matrix (25 cells, including empty ones), each with `score`, `level`, and the real risk `count` in that cell. |

All figures are computed live from the database on every request — nothing is cached or
pre-aggregated.
