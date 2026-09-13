# Security Notes

## Authentication

- **Credential check**: `POST /auth/login` runs Passport's local strategy, which calls
  `AuthService.validateUser()` — looks up the user by email, then always calls `bcrypt.compare()`
  (bcrypt, **12** salt rounds — `apps/api/src/users/password.util.ts`) before deciding whether to
  reject, regardless of whether the account exists:
  - **Timing-safe lookup**: if the email doesn't match any account, `bcrypt.compare()` still runs
    against a fixed, precomputed dummy hash (`AuthService.DUMMY_PASSWORD_HASH`) instead of
    short-circuiting immediately. This keeps a "no such user" request and a "wrong password"
    request taking roughly the same amount of time, closing a timing side-channel that would
    otherwise let an attacker enumerate valid emails purely from response latency even though both
    cases return the same generic error message.
  - Account existence, `isActive`, and password match are all checked together at the end, and
    every failure path returns the identical `401 Invalid credentials` — no distinct error message
    reveals which check failed.
- **Startup validation of `JWT_SECRET`** (`apps/api/src/config/env.validation.ts`, wired into
  `ConfigModule.forRoot({ validate })`): the API **refuses to start** if `JWT_SECRET` is missing,
  shorter than 16 characters, or matches a known placeholder value (`changeme`, `secret`,
  `password`, etc. — see the file for the full list). This exists specifically because a weak or
  default secret is otherwise invisible at runtime — every other auth check still "works" while
  silently accepting forged tokens signed with the same guessable secret.
- **Token issuance**: on success, a JWT (`{ sub, email, role }`) is signed with `JWT_SECRET` and
  set as an **httpOnly** cookie (`access_token`) — never returned in the response body, never
  accessible to client-side JavaScript. `POST /auth/login` request bodies are validated against
  `LoginDto` (`@IsEmail`, `@IsString` + `@MinLength(8)`) via the global `ValidationPipe`; note that
  because Nest runs guards before pipes, `LocalAuthGuard`'s Passport authentication attempt still
  happens against the raw body first, so this validation's practical effect is limited to requests
  that already passed authentication — see the code comment on `AuthController.login()` for the
  full explanation.
- **Cookie flags**: `httpOnly: true`, `sameSite: 'lax'`, `secure` driven by `COOKIE_SECURE` (must
  be `true` behind HTTPS), `maxAge` matches `JWT_EXPIRES_IN` (default 8h).
- **No refresh tokens, and no server-side revocation.** Both are deliberate MVP-scope decisions,
  not oversights — sessions simply expire after `JWT_EXPIRES_IN` and the user logs in again; there
  is no denylist or session store, so a token remains valid for its full lifetime even after
  logout if it were somehow copied out of the httpOnly cookie beforehand. See
  [Known limitations](#known-limitations).
- **`GET /auth/me`** lets a client check who's currently authenticated without re-sending
  credentials.

## Authorization (RBAC)

Five roles: `ADMIN`, `RISK_MANAGER`, `ASSET_OWNER`, `AUDITOR`, `VIEWER` — see
[`api-reference.md`](./api-reference.md) for the full per-endpoint matrix. Two layers:

1. **Route-level** (`@Roles(...)` + the global `RolesGuard`) — coarse-grained, declared per
   controller method (or per controller, e.g. `UsersController`, `AuditLogController`).
2. **Service-level ownership checks** — used where a role alone isn't precise enough:
   - `AssetsService.assertCanManage()`: an `ASSET_OWNER` may update only assets they own; `ADMIN`
     and `RISK_MANAGER` may manage any asset. Separately, `AssetsService.update()` restricts the
     `ownerId` field itself (reassigning an asset to a different owner) to `ADMIN`/`RISK_MANAGER`
     only, even for an `ASSET_OWNER` updating an asset they currently own — this closes a gap where
     an owner could otherwise reassign accountability away from themselves via a direct API call,
     since the frontend form never exposes that field to them but the API previously accepted it
     from anyone who passed the route-level `@Roles()` check.
   - `UsersService`: an admin cannot demote their own role away from `ADMIN`, deactivate their own
     account, or delete their own account (self-lockout protection).

`Risk.ownerId` and `TreatmentPlan.ownerId` record **accountability**, not a mutation permission —
there is no ownership carve-out for risks or treatment plans (unlike assets); mutating them stays
role-gated to `ADMIN`/`RISK_MANAGER` only. This was a deliberate, explicitly-flagged design
decision made during Phase 5 and re-confirmed in later phases.

## Input validation

A global `ValidationPipe({ whitelist: true, transform: true })` (`main.ts`) rejects any request
body field not declared on the target DTO, and enforces every `class-validator` constraint —
including the risk-scoring domain invariant (`likelihood`/`impact` must be integers 1–5). The
`whitelist` option also mitigates mass assignment: extra fields in a request body (e.g. a client
attempting to set `id`, `createdAt`, or a `passwordHash` directly) are silently stripped before the
DTO reaches a service, rather than being passed through to Prisma.

**Injection/XSS — what was actually tested, not assumed:** the codebase has no raw SQL anywhere
(`$queryRaw`/`$executeRaw` do not appear in `apps/api/src`) — every query goes through Prisma's
parameterized query builder, so classic SQL injection has no code path to exploit. This was
verified both by inspection and by sending SQL-metacharacter payloads (quotes, `DROP TABLE`-style
strings) through live `POST` requests during manual testing; they were stored and returned as
inert literal text, exactly as any other string value. For XSS: the frontend never uses
`dangerouslySetInnerHTML` or raw DOM `innerHTML` anywhere — every rendered value goes through
React's default JSX interpolation, which HTML-escapes text content automatically. A `<script>`
payload was stored via the API and round-tripped back through the UI as inert text, not executed,
confirming this in practice rather than by inspection alone.

## Security headers

[`helmet`](https://www.npmjs.com/package/helmet) is applied globally in `main.ts`
(`app.use(helmet({ contentSecurityPolicy: false }))`), which sets `X-Content-Type-Options: nosniff`,
`X-Frame-Options: SAMEORIGIN`, `Strict-Transport-Security`, `Referrer-Policy: no-referrer`, and
related headers, and removes the `X-Powered-By: Express` header. Helmet's default
`Content-Security-Policy` is explicitly disabled, since this API serves only JSON — there is no
server-rendered HTML for a CSP to protect, and helmet's HTML-oriented default policy has no
meaningful effect here.

## CORS

The API serves the built frontend from the same origin/process (`ServeStaticModule` in
`app.module.ts`, with `app.setGlobalPrefix('api')` in `main.ts` keeping every controller route under
`/api/**` so it can't be shadowed by the SPA's fallback route). Browser traffic is therefore
same-origin and no CORS configuration is applied — there is no cross-origin caller to allow.

## CSRF

There is no separate CSRF token mechanism; CSRF resistance comes from the `access_token` cookie's
`SameSite=Lax` flag together with the same-origin deployment above (a third-party site has no origin
to be exempted from in the first place). This was verified with a real
browser (not just by inspecting the cookie flag): a genuine cross-origin page was loaded in Chrome
and made to submit a `<form>` `POST` and a `fetch(..., { credentials: 'include' })` request against
a mutating endpoint. In both cases the request reached the server **with no `Cookie` header
attached at all** — captured and confirmed directly from the outgoing request, not inferred from
the response status — so the mutation was rejected as unauthenticated/unauthorized rather than
executed. `SameSite=Lax` cookies are excluded from cross-site requests using "unsafe" methods
(`POST`/`PUT`/`PATCH`/`DELETE`) by design; only top-level `GET` navigations are exempt, and none of
this API's mutating endpoints are reachable via `GET`.

## Rate limiting

`ThrottlerGuard` is global (20 requests/minute per client, in-memory — see
[Known limitations](#known-limitations)). `POST /auth/login` is additionally throttled to 5
requests/minute to slow down credential-stuffing/brute-force attempts.

## Data exposure

- `passwordHash` is **never** serialized in any API response — every user-returning endpoint uses
  `toSafeUser()` (`apps/api/src/common/types/safe-user.ts`), which strips it before the response
  leaves the service layer. This is unit-tested directly (`safe-user.spec.ts`).
- Audit-log entries are also protected wherever a snapshot could otherwise carry a `User`
  (directly or nested): `UsersService` runs `toSafeUser()` on the `User` rows it snapshots, and
  `AssetsService` runs `toAssetWithSafeOwner()` (which itself calls `toSafeUser()` on the nested
  `owner`) before an asset snapshot — which Prisma fetches with `include: { owner: true }` — is
  passed to `AuditLogService.record()`. Every module that snapshots an entity with a nested `User`
  relation must apply the same pattern; `assets.service.spec.ts` and `users.service.spec.ts` both
  assert directly that no audit-log payload contains a `passwordHash`.

## Audit logging

Every mutating operation across Users, Assets, Threats, Vulnerabilities, Risks, Controls
(including risk↔control link/unlink), and Treatment Plans writes an `AuditLog` row: actor
(`userId`, from the authenticated request), `action`, `entityType`, `entityId`, and `oldValue`/
`newValue` snapshots where applicable. The `audit-log` module exposes **read-only** endpoints
(`GET /audit-logs`, `GET /audit-logs/:id`) — there is no create/update/delete route, so the only
way an entry is ever written is as an automatic side-effect of a real mutation. Read access is
restricted to `ADMIN`/`AUDITOR` (not open to every role, unlike most reference-data reads), since
entries can contain full before/after field values of any entity in the system.

A failed audit write is **not** silently swallowed — if `AuditLogService.record()` throws, the
error propagates like any other unhandled exception, so a broken audit trail is never hidden. This
trades a small amount of resilience for never masking an audit-logging bug.

## Known, accepted dependency finding

Based on the latest `npm audit` run against this repository: **3 high-severity findings, 0
critical/moderate/low.** All three are the *same* advisory —
[GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), a stack-exhaustion
denial-of-service in `deepmerge-ts` when merging deeply recursive object graphs — reported once for
each package in the chain that depends on it: `deepmerge-ts` itself, `@prisma/config` (which
depends on it), and `prisma` (which depends on `@prisma/config`, and is listed as a direct
`devDependency` of `apps/api`).

- **Not runtime-reachable.** `@prisma/client` — the package actually imported by the running NestJS
  server (`apps/api`'s `dependencies`, not `devDependencies`) — has no dependency on `@prisma/config`
  or `deepmerge-ts` at all (confirmed via `npm view @prisma/client@<installed version> dependencies`,
  and via `npm ls @prisma/config`, which only resolves it through `prisma`, the CLI). The vulnerable
  code only runs inside the `prisma` CLI process itself (`generate`/`migrate`/`seed`/`studio`), never
  inside the deployed API. This is a development-tooling supply-chain finding, not a claim that the
  running application is vulnerable to it.
- **No non-breaking fix currently exists.** `npm audit fix` (without `--force`) makes no change to
  any of these three packages — verified with `--dry-run`. Even the latest published
  `@prisma/config` still depends on the same vulnerable `deepmerge-ts` version; the only path to a
  nominal "fix" is forcing `prisma` to an unstable pre-release major version, which was not applied.
- Re-verified at the end of each subsequent review pass; the result has been consistent every time.

## Known limitations

These are residual, architectural characteristics of the current design — not defects found and
left unfixed, but tradeoffs that should be weighed before a production deployment:

- **No server-side JWT/session revocation.** Logout only clears the client-side cookie; there is no
  denylist or session store, so a token that was somehow copied out of the httpOnly cookie before
  logout would remain valid until it naturally expires (`JWT_EXPIRES_IN`, default 8h). Not
  independently exploitable — it only matters if a token is already compromised through some other
  means — but it does affect how quickly a compromised session could be contained. Closing this gap
  would mean either a server-side revocation store (e.g. Redis) checked on every request, or
  switching to short-lived access tokens with rotating refresh tokens.
- **In-memory rate limiting** — `ThrottlerGuard`'s default in-memory storage means limits reset on
  restart and aren't shared across multiple API instances. This is fully effective for a
  single-instance deployment (verified live — see below); a horizontally-scaled deployment (more
  than one API process/pod behind a load balancer) would need a shared store (e.g. Redis-backed
  throttling), which was explicitly out of MVP scope.
- **No pagination or filtering** on any list (`GET` collection) endpoint — acceptable at the
  current demo data scale, but a real deployment with a large dataset would need it (both for
  usability and to bound response size / query cost).
- **No HTTPS termination in the app itself** — `COOKIE_SECURE` exists specifically because TLS is
  expected to be handled by a reverse proxy/load balancer in front of the API, not by NestJS.
- **Demo seed credentials** (`docs/environment-variables.md`, root README) are intentionally weak,
  clearly-labeled, non-production values shared by every seeded user — never use them, or the
  `changeme` placeholders in `.env.example`, outside local development.

## Testing & verification status

- **Unit tests**: 200 tests across 30 suites (`npm run test -w apps/api`), covering business logic,
  RBAC wiring, and DTO validation, including negative cases that simulate Prisma error codes
  (`P2002` unique-constraint, `P2003` FK-restricted-delete).
- **E2E test**: `npm run test:e2e` runs one Supertest spec (`test/app.e2e-spec.ts`, the default
  NestJS scaffold test) against the full module graph and a real database connection — it passes,
  confirming the app boots and every guard/module wires up correctly end to end. It only exercises
  the root `GET /` health endpoint, not the domain modules — it is not a substitute for the manual
  testing described below.
- **Live manual/adversarial testing**: with a real local PostgreSQL instance and the API actually
  running, two full manual security-testing passes were performed directly against the live HTTP
  API (not just by reading the code). This is what each of the sections above is actually based on,
  not assumption. Specifically verified live:
  - Every protected endpoint returns `401` when unauthenticated; all five roles were logged in and
    tested directly against the API (not just through the UI) for both allowed and forbidden
    actions — including `VIEWER` attempting every write, `RISK_MANAGER` attempting `ADMIN`-only
    routes, `AUDITOR`'s read-only-plus-audit-log access, and `ASSET_OWNER`'s ownership boundaries
    (including the cross-owner IDOR check and the ownership-reassignment gap described above, both
    before and after the fix).
  - JWT handling: a garbage token, a token signed with a different/wrong secret, an `alg: "none"`
    token, and an expired-but-otherwise-validly-signed token were all rejected with `401`. Before
    the `JWT_SECRET` startup validation existed, a token forged with the (at-the-time) weak local
    secret was accepted by the API — confirming the vulnerability described above was real, not
    theoretical — and rejected again immediately after the fix and secret rotation.
  - `ADMIN` self-lockout (own role/deactivation/deletion) enforced identically via direct API calls.
  - CORS, CSRF, and cookie flags (see the sections above) were checked against live responses and,
    for CSRF specifically, a real Chrome browser.
  - `/audit-logs` confirmed to have no `POST`/`PATCH`/`DELETE` route at all, even as `ADMIN`.
  - No `passwordHash` found in any live API response or in a full `/audit-logs` dump.
  - Rate limiting (`429`) confirmed firing on repeated login attempts.
  - Basic foreign-key enforcement was exercised implicitly through ordinary live operations during
    this testing (creating/linking real risks, controls, and assets against real foreign keys in
    the seeded database). The specific conflict-path behaviors — unique-constraint violations,
    deletes blocked by a still-referenced foreign key, cascade deletes — were **not** individually
    re-triggered live during this testing, which focused on authentication/authorization/injection;
    those paths remain covered by the unit tests referenced above rather than by live reproduction.
- **Not tested**: genuine multi-instance rate-limit bypass (no multi-instance topology exists in
  this environment), and real TLS/HTTPS-dependent behavior (`Secure` cookie enforcement, HSTS
  effectiveness) — this environment only serves HTTP locally.
