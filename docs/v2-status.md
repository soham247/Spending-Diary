# V2 status and handover

Reviewed 2026-10-29 against the local code and Git history. This document updates the earlier migration handover; product requirements remain in `prd.md`, `schema.md` and `decisions.md`.

## Branches

- `feat/data-layer-auth` is the active V2 branch. It contains the seven migration commits after `main`, plus the security remediation, dependency updates and Postman assets being published with this status.
- `migrate/v2` and `spike/better-auth` both point to `ec7de30`, already an ancestor of the active branch. Neither has additional work to merge.
- `main` contains the old application. Keep V2 on its feature branch until the remaining application work is ready for review and rollout.

## Implemented and verified

- Drizzle/node-postgres schema, deferred balance triggers, Better Auth configuration and authentication pages.
- Expense and settlement domain services, transactional authorization, ledger/balance updates, optimistic concurrency and durable creation idempotency.
- Expense, settlement and overall-balance routes, fetch wrappers and TanStack Query hooks.
- Security regression tests and reusable Postman collection, environment template, OpenAPI contract and local runner.
- Updated dependencies and lockfile. The recorded full npm audit reports zero known vulnerabilities.

Latest remediation verification: 113 unit/integration tests and 232 Postman assertions across 101 requests passed. Typecheck, production build and Drizzle checks passed. ESLint passed with four existing hook warnings in legacy components. See [the security review](../postman/SECURITY-REVIEW.md) for evidence and limits. The Postman run includes expected 501 responses from unfinished legacy routes; these do not establish feature completeness.

## Remaining work

V2 is **not yet UI-only**. The repository still needs:

- App-shell migration: wire `ReactQueryProvider`, migrate legacy navigation/session handling and create the authenticated `(app)` layout and pages described in `design.md`.
- Group creation/detail/member management and their scoped APIs/queries.
- Invite creation/claim and placeholder merging, including their domain services and public landing page.
- Profile APIs, activity queries/feed, debt simplification, insights and notification flows required by the PRD.
- Replacement or removal of the 11 legacy route files returning 501, coordinated with their old UI callers.
- Browser-level verification and deployment configuration once the new flows are implemented.

`src/lib/domain/` currently contains expenses, settlements, ledger, splits and idempotency. Group/invite/activity APIs and the `simplify.ts`, `invites.ts` and `merge.ts` services described in the earlier handover are absent.

## Database and configuration

No migration has been applied to the user's Supabase database as part of this work. Migration `0002_lowly_roxanne_simpson.sql` was generated and applied only to an isolated local PostgreSQL test database; the original balance triggers remain intact. Confirm existing migration history and use Drizzle's migration runner with a genuine direct connection before running the updated application against the shared database. Do not paste migrations manually or use `drizzle-kit push` against it.

Supabase can host the PostgreSQL database while this app connects through Drizzle and `pg`; there is no Supabase SDK requirement. The earlier handover's statement that Supabase is not used as a database provider does not match the local connection configuration.

Use the variable names in [`.env.example`](../.env.example): `NEXT_PUBLIC_APP_URL`, `SMTP_PASS` and `MAIL_FROM` (rather than the alternate names in the earlier handover). `DATABASE_URL` is the runtime connection and `DIRECT_URL` is the migration connection. Real `.env` values and `.postman/local/` fixtures stay ignored and must not be published.

The reusable Postman base URL is `http://localhost:3000`; requests append `/api/...`. The isolated test runner uses port 3100 and a disposable database instead. See [Postman setup and usage](../postman/README.md).
