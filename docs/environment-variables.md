# Environment Variables

## Root — `.env` (used by `docker-compose.yml`)

| Variable | Example / Default | Required | Description |
|---|---|---|---|
| `POSTGRES_USER` | `itrms` | No (defaults to `itrms`) | Postgres role created in the container. |
| `POSTGRES_PASSWORD` | `changeme` | No (defaults to `itrms`) | Password for that role. **Change for anything beyond local dev.** |
| `POSTGRES_DB` | `itrms` | No (defaults to `itrms`) | Database name created in the container. |
| `POSTGRES_PORT` | `5432` | No (defaults to `5432`) | Host port mapped to the container's `5432`. |

## `apps/api/.env`

| Variable | Example | Required | Description |
|---|---|---|---|
| `NODE_ENV` | `development` | No | Standard Node environment flag. |
| `PORT` | `3000` | No (defaults to `3000`) | HTTP port the NestJS server listens on. |
| `DATABASE_URL` | `postgresql://itrms:changeme@localhost:5432/itrms?schema=public` | **Yes** | Prisma connection string. Must match the `POSTGRES_*` values above if using the provided `docker-compose.yml`. |
| `JWT_SECRET` | `changeme` | **Yes** | HMAC secret used to sign/verify access tokens. **The `.env.example` value is a template, not a runnable default** — the API refuses to start if `JWT_SECRET` is missing, under 16 characters, or a known placeholder like `changeme`, even for local dev. Generate a real value (e.g. `openssl rand -base64 48`). See [`security.md`](./security.md). |
| `JWT_EXPIRES_IN` | `8h` | No (defaults to `8h`) | Access-token lifetime, in [`ms`](https://www.npmjs.com/package/ms) format. Also drives the auth cookie's `maxAge`. |
| `COOKIE_SECURE` | `false` | No (defaults to `false`) | Set to `true` in any environment served over HTTPS, so the `access_token` cookie requires TLS. |
| `COOKIE_DOMAIN` | `localhost` | No | Cookie `Domain` attribute. Leave unset in production — the API serves the frontend from the same origin, so a host-only cookie is correct. |

## `apps/web/.env`

| Variable | Example | Required | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3000/api` | No (defaults to `/api`) | Base URL the frontend sends every API request to (`apps/web/src/api/client.ts`). In production this is left unset so requests resolve to the relative `/api` path on the same origin the SPA is served from; for local dev it points at the separately-running Nest dev server, including the `/api` prefix set by `app.setGlobalPrefix('api')`. |

## Notes

- Every `.env` file has a committed `.env.example` counterpart (`/.env.example`,
  `apps/api/.env.example`, `apps/web/.env.example`) — copy it to `.env` and adjust before running
  anything.
- No `.env` file is committed to the repository (see `.gitignore`).
- `JWT_SECRET` and `POSTGRES_PASSWORD` shown above are `changeme` **template** placeholders, not
  working defaults — `POSTGRES_PASSWORD` works as-is only because `docker-compose.yml` falls back
  to it; `JWT_SECRET` must always be replaced with a real value, including for local dev (the API
  will refuse to start otherwise) — see [`security.md`](./security.md).
