# Spending Diary API regression suite

The [Spending Diary collection](https://go.postman.co/workspace/647509c6-4fa4-4830-8c9b-d38227647bf0/collection/38782113-d1b06f20-b87e-46f1-9448-fa0781d13873) is bound to your personal My Workspace. It has 101 requests covering auth boundaries, expense lifecycle, splits, multiple payers, validation, authorization, idempotency, settlements, currency integrity and concurrency.

Current result: **232/232 Postman assertions and 113 unit/integration tests pass. Full npm audit: zero vulnerabilities.** See [the security remediation](SECURITY-REVIEW.md) for scope and deployment steps.

## URLs

The shared collection and environment template use `http://localhost:3000`. Requests append `/api/...`, so `{{base_url}}/api/balances` reaches `http://localhost:3000/api/balances`. Do not include `/api` in `base_url`.

The isolated runner overrides the environment with `http://127.0.0.1:3100`. Its database must be on loopback and its name must end in `_test`. It creates and changes disposable financial fixtures; do not point the suite at valuable data.

## Run locally

Use Node 24 (the tested runtime), installed npm dependencies, Postman CLI and Docker Desktop. Start the disposable database once:

```powershell
docker run --detach --rm --name spending-diary-postman-test --publish 127.0.0.1:55432:5432 --env POSTGRES_DB=spending_diary_postman_test --env POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine
npm run test:api
```

The container's trust-authenticated PostgreSQL port is bound only to loopback. The runner applies committed migrations, starts a separate app on 3100 and a local SMTP sink, signs up fresh users through the real HTTP API, marks fixture emails verified in the scratch database, then signs in through the real API. It creates a friendship and two groups with Drizzle fixtures; financial operations run through HTTP.

Separate authentication integration tests exercise actual verification/reset proofs against an in-memory mailbox, including single-use reset, session revocation and simulated Google ownership claims. SMTP messages and auth bodies/tokens are not logged. Signup no longer needs the standard-field fixture workaround from the baseline audit.

The app and SMTP fixture stop after the run. The database container stays available for reruns; stop/remove it with `docker stop spending-diary-postman-test`. The default Next.js build directory is shared with normal dev/build commands, so finish or stop a regular dev/build process before running this suite.

Override `POSTMAN_TEST_DATABASE_URL` or `POSTMAN_TEST_PORT` when necessary. The runner does not use `.env` to choose a database. Cookies and fixture IDs are written to ignored `.postman/local/local.environment.yaml`; the standard CLI transcript is saved to ignored `.postman/local/latest-run.txt`. Published environment credentials are empty.

Run the full unit/integration suite against the same disposable database:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://postgres@127.0.0.1:55432/spending_diary_postman_test'
npm test
```

Integration tests clear their scratch tables. Run them separately from the HTTP suite.

## Maintain and publish

```powershell
npm run postman:generate
npm run postman:lint
npm run typecheck
npm run lint
npm run build
```

Edit `postman/scripts/build-collection.mjs` to maintain generated requests. It writes v3 collection YAML, the empty environment template, API inventory, OpenAPI contract, and `Spending-Diary.postman_collection.json` for desktop import. For manual requests against your regular server, populate a local environment copy with test sessions and IDs.

Review `postman workspace diff --push-strategy default` before `postman workspace push --push-strategy default --yes`. Preserve the binding IDs in `.postman/resources.yaml`. Do not use force-sync or add an empty workspace-globals file, which could overwrite unrelated cloud globals.

## Evidence

- [Current passing run](results/2026-10-29-remediation-run.txt)
- [Baseline failing run](results/2026-10-29-run.txt)
- [Current dependency audit](results/dependency-audit.json)
- [Security remediation and rollout notes](SECURITY-REVIEW.md)

The suite includes 21 checks of legacy 501 responses. These document 11 stub route files and do not count as implemented features. Standard CLI execution was used; no Enterprise report-export feature is required.
