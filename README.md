# Spending Diary

A Next.js application for shared expenses and a personal spending diary. V2 uses PostgreSQL through Drizzle/node-postgres, Better Auth, TanStack Query, Zod and shadcn/ui.

The application supports personal and shared expenses, four split modes, multiple payers, groups, friends, invitation claims, settlement recording, activity and monthly insights. UPI links open the user's payment app; recording a payment requires confirmation.

## Local development

Use Node 24, npm and PostgreSQL. Copy .env.example to .env and configure the pooled DATABASE_URL, direct DIRECT_URL, Better Auth secret, application URL and SMTP. Google OAuth and Web Push require their corresponding settings.

Dependency updates use stable npm releases with compatible peer requirements. TypeScript stays on 6.0.x while the ESLint parser requires versions below 6.1; ESLint stays on 9.x while its React/import plugins exclude 10. Node typings match the Node 24 runtime. Next.js 16 uses src/proxy.ts for request redirects; authorization remains in session/domain guards.

Install dependencies with npm ci. Apply reviewed migrations with npm run db:migrate through DIRECT_URL, then start npm run dev. Test migrations on a disposable database first. Never reset shared application data or use drizzle-kit push against a shared database.

## Checks

Copy .env.test.example to .env.test and set TEST_DATABASE_URL to a disposable database ending in _test. Integration tests migrate and clear that database. Keep it separate from application data.

- npm run preflight: run before pushing; includes typecheck, lint, unit/integration tests, Postman artifact lint, production builds, HTTP regression tests and Chromium acceptance journeys. Stops on the first failure. Requires the test databases, Postman CLI and installed Chromium described below.
- npm run verify: TypeScript, ESLint, unit/integration tests, Postman artifact lint and production build.
- npm run test:api: HTTP regression tests against a separate loopback database.
- npm run test:browser: isolated production build, HTTP regression tests and Chromium acceptance journeys.
- npm run db:generate and npm run db:check: migration generation and consistency checks.

Install Chromium with npx playwright install chromium before running browser tests. The HTTP/browser runner uses a disposable database on port 55432 by default and starts its own app and SMTP sink. See [Postman instructions](postman/README.md) for database setup and overrides. Do not run it alongside another Next.js process sharing the build directory.

## Deployment

Apply migrations before deploying application code. Set NEXT_PUBLIC_APP_URL to the deployed origin and configure matching Google OAuth callbacks, SMTP, VAPID keys and CRON_SECRET. Keep BETTER_AUTH_SECRET stable; invitation token recovery also uses it.

Before release, verify live Google ownership linking, verification/reset email delivery and sender DNS, mobile UPI payment return, Web Push, installation, keyboard navigation, light/dark themes and mobile performance. Local fixtures and Chromium tests do not establish live-provider behavior.

Maintenance runs daily at 03:00 UTC (08:30 India time). Inspect deployment logs after the first run for balance reconciliation mismatches; maintenance reports drift without automatically repairing balances. Wrong-claim reports require manual review through a restricted database connection and never reverse identity merges.

## Project references

- [Product requirements](docs/prd.md)
- [Design](docs/design.md)
- [Schema](docs/schema.md)
- [Decisions](docs/decisions.md)

Recurring expenses, budgets, receipts, export, currency conversion and premium features remain outside Phase 1.
