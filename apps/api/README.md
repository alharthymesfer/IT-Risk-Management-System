# @itrms/api

Backend API for the [IT Risk Management System](../../README.md) — a NestJS + PostgreSQL (Prisma)
service providing JWT/cookie authentication, five-role RBAC, the risk-management catalog (assets,
threats, vulnerabilities, risks, controls, treatment plans), audit logging, and dashboard
aggregates. In production this same process also serves the built React SPA from `apps/api/public`
(see [`../../docs/architecture.md`](../../docs/architecture.md)); every API route is namespaced
under `/api`.

## Development

Run from the repository root (this package is part of an npm workspaces monorepo):

```bash
npm run dev:api          # start:dev — watch mode, http://localhost:3000
npm run build --workspace=@itrms/api
npm run test --workspace=@itrms/api       # unit tests
npm run test:e2e --workspace=@itrms/api   # e2e tests
```

Copy `.env.example` to `.env` and fill in real values before starting — see
[`../../docs/environment-variables.md`](../../docs/environment-variables.md). `JWT_SECRET` is
required and the app refuses to start with a missing, short, or placeholder value.

## Database (Prisma)

```bash
npm run prisma:migrate:dev --workspace=@itrms/api   # local dev migrations
npm run prisma:migrate:deploy --workspace=@itrms/api # apply migrations in production
npm run prisma:seed --workspace=@itrms/api           # demo data (idempotent, fixed ids)
```

## Further reading

- [API reference](../../docs/api-reference.md) — every endpoint, role requirement, and response shape.
- [Security](../../docs/security.md) — auth, RBAC, cookie/CORS posture, and known limitations.
- [Architecture](../../docs/architecture.md) — monorepo layout and the same-origin deployment model.
