# API security review — 2026-10-29

Target: Next.js development server on `http://127.0.0.1:3100`, PostgreSQL 17 in a disposable local Docker container, committed migrations applied. Postman CLI 1.76.0. No attacks were run against Supabase or a deployed service. Published requests default to the regular dev server, `http://localhost:3000`; the isolated runner overrides that value.

**101 requests, 232 assertions, 209 passed, 23 failed; exit code 1.** See [the complete standard CLI output](results/2026-10-29-run.txt). Counts include 21 checks of legacy 501 responses, which establish only that those routes are stubs.

## Blocking findings confirmed through HTTP

### S1 — High: unrelated users can modify other people's expenses and settlements

Evidence: the outsider account receives 404 when reading an owner's private expense, but receives 200 when PATCHing or DELETEing that same expense. On an independently created and owner-deleted private expense, the outsider also receives 200 when restoring it. DELETE on another pair's settlement returns 200. Expected: 404 with no change.

Sources: `src/app/api/expenses/[id]/route.ts:27`, `src/app/api/expenses/[id]/route.ts:50`, `src/app/api/expenses/[id]/restore/route.ts:12`, `src/app/api/settlements/[id]/route.ts:12`. Domain mutations in `src/lib/domain/expenses.ts:155` and `src/lib/domain/settlements.ts:86` take no viewer ID and call no ownership/membership guard. Authentication alone does not authorize a target object.

Reproduce using folder `06 Object authorization` with the runner's separate owner and outsider sessions. Knowing a target ID is sufficient to attempt the mutation; the read check does not protect write paths. This is an authenticated object authorization vulnerability, not an anonymous authentication bypass.

Fix: carry `viewerId` into each domain mutation and enforce participant/admin permissions inside the transaction before any mutation. Re-run all outsider tests and verify the target state stays unchanged.

### S2 — High: users can create financial records involving unrelated people or groups

Evidence: an outsider receives 201 when creating an expense in a group it does not belong to, creating a direct expense involving only the owner and friend, or recording a settlement between those two other people. Expected: 404 and no ledger effect.

Sources: `src/lib/domain/expenses.ts:107`, `src/lib/domain/settlements.ts:40`, and the create routes. No guard validates current membership, friendship, blocks, or the caller's participation before writing. This allows forged debt/payment records.

Fix: authorize caller, scope and every participant before writing, and enforce the group's currency and archived status. Preserve transactional checks rather than trusting IDs supplied in JSON.

### S3 — High: settlement payments increase debt

Evidence: a separate USD expense creates a debt of 5000 minor units. Recording a payment of 2000 changes its absolute balance to 7000; expected 3000. Voiding that settlement restores 5000.

Source: `src/lib/domain/settlements.ts:74`. The settlement writes a debt edge in the same direction as the original expense debt. Folder `07 Settlement accounting` uses a separate currency so other test records cannot affect the expected result.

Fix: make settlement ledger effects reduce the payer's debt, keeping voids and the cache consistent. Add domain/property tests as well as the HTTP regression before changing ledger behavior.

### S4 — High: currency edits leave the ledger in the old currency

Evidence: changing a 10000-minor-unit expense from INR to EUR returns 200, and reading the expense shows EUR. Balances contain no EUR entry for its 5000 share. The old ledger/cache was not moved.

Sources: `src/lib/domain/expenses.ts:179` and `src/lib/domain/expenses.ts:203`. Ledger rebuilding only happens when `input.participants` exists, and the PATCH route does not forward participants. Folder `08 Currency integrity` captures the inconsistency.

Fix: either enforce the documented currency rules and reject the edit, or void/rebuild the ledger atomically when any financial field changes. Keep balance lines separate by currency.

### S5 — High: create idempotency is incomplete

Evidence: repeating an expense request with the same key/body returns 500 rather than the original ID; reusing that key with a changed body also returns 500 rather than 409. Repeating a settlement key/body returns 201 with a different ID, and changed-body reuse also returns 201. Repeated payment submissions can therefore duplicate financial effects.

Sources: `src/lib/domain/expenses.ts:107`, `src/lib/domain/settlements.ts:40`, `src/lib/db/schema.ts` expense index and settlement declaration. Expense uniqueness prevents a second insert but is not handled as an idempotent replay; settlement keys have no equivalent uniqueness enforcement. Folder `05 Idempotency` tests same-body replay and changed-body conflicts.

Fix: scope keys to the authenticated creator, persist/check a canonical request digest and original result transactionally, and handle both sequential and concurrent retries.

### S6 — Medium: invalid financial input reaches the database or is accepted

Evidence: impossible calendar dates, row-integer overflow, duplicate participants and malformed JSON return 500. Unbalanced payer totals return 500 rather than the contract's 422. Missing create idempotency headers return 500 rather than 400. The unknown currency `ZZZ` is accepted with 201.

Sources: `src/lib/validation/expense.ts:7`, `src/lib/validation/expense.ts:12`, `src/lib/validation/settlement.ts:3`, and `src/lib/api/route-handler.ts:99`. The date check validates only the string shape. Amount validation does not enforce the PostgreSQL integer limit. The missing-key helper throws a plain error which its mapper does not recognize. The deferred database trigger does reject the unbalanced transaction; it was not disabled.

Fix: validate actual dates, supported currency codes, participant uniqueness, integer bounds and balancing at the shared validation/domain edges. Map JSON syntax and header errors to the correct responses. These tests establish error handling and integrity gaps; they do not establish SQL injection or a successful denial-of-service attack.

## Should fix — code review findings and functional gaps

- **Non-atomic version check:** `src/lib/domain/expenses.ts:169` reads a version and `src/lib/domain/expenses.ts:200` updates by ID alone. The tested two-request race produced one 200 and one 409, so a lost update was not reproduced in this run. A lock or conditional `WHERE id AND version` is still needed to guarantee concurrency correctness under other schedules.
- **Rate limits are in memory:** `src/lib/auth/auth.ts:86` omits `storage: "database"`; installed Better Auth defaults to memory in `node_modules/better-auth/dist/index.mjs:121`. A 429 was observed during rapid fixture logins; the final suite waits for that legitimate window. This confirms local throttling, not shared enforcement across serverless instances. Database-backed rate limits are required by D-022.
- **Group query does not scope itself by viewer:** `src/lib/db/queries/expenses.ts:33` accepts a viewer ID but does not use it. No currently reachable group-list route was found to exploit it. Fix the query before exposing it; a caller-side guard is insufficient under the project rules.
- **Metadata-only edit rejected:** PATCH with only `version` and `description` returns 400. `editExpenseSchema` intersects with an object whose `splitType` and `participants` are required when the body is present. Supplying them gets past validation, but the route drops them before calling the service. Split/participant edits therefore need a complete implementation and tests.
- **Normal email signup fails:** a valid synthetic signup returned 422 during setup. `auth.ts:118` maps `defaultCurrency` to `default_currency`, while Drizzle exposes the camelCase property; the installed adapter rejects missing schema keys. This is a source-backed explanation of the observed failure, not an independently instrumented production diagnosis. The runner creates credentials through a standard-field Better Auth fixture instance, marks fixture emails verified in the scratch DB, and uses the real app sign-in API. It never hashes/stores passwords itself. Public signup, email verification and reset/account-linking flows remain unverified end to end.
- **11 legacy route files remain stubs:** the inventory and `10 Legacy endpoint status` record 21 GET/POST responses of 501. A successful stub check does not count as a finished feature. See `api-inventory.json` for exact paths.

## Dependency advisory findings

`npm audit --omit=dev --json` reports **17 affected dependency entries: 3 critical, 11 high, 3 moderate**. Critical entries include `next`, `better-auth`, and transitive `form-data`. The [saved audit](results/dependency-audit.json) records installed versions, affected ranges, advisory links and npm's available fixes. It is an advisory scan, not proof that every listed attack path is used by this app.

The maintainer's [Next.js middleware advisory](https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw) lists 15.1.11 in the affected range and discusses hosting conditions. This application's API guards do not rely on middleware, so it does not explain S1/S2. The [Better Auth cookie-cache advisory](https://github.com/better-auth/better-auth/security/advisories/GHSA-xg6x-h9c9-2m83) requires features not enabled here; do not label that advisory an observed two-factor bypass in this app. The [form-data advisory](https://github.com/form-data/form-data/security/advisories/GHSA-fjxv-7rqg-78g4) also needs a reachable multipart-generation path to establish practical exploitability.

Review and upgrade affected packages with their migration requirements; do not apply `npm audit fix --force` blindly. No dependency versions were changed in this audit.

## Verification and scope

| Check | Result |
| --- | --- |
| Postman collection lint | 101 request files, zero errors/warnings |
| Postman environment lint | Pass, zero errors/warnings |
| OpenAPI syntax lint | Pass |
| HTTP regression/security suite | 101 requests, 232 assertions, 23 failed, exit 1 |
| TypeScript | Pass |
| ESLint | Exit 0 with four pre-existing React hook dependency warnings |
| Vitest unit suite | 62 passed |
| Vitest integration suite | Blocked before nine tests: existing setup reads a node-postgres QueryResult as an array and thinks the database name is empty |
| Production build | Fails on existing `globals.css:109`: `@layer base` without matching `@tailwind base`; network font access was retried with permission |
| Production dependency audit | 17 affected entries; exit 1 |

Startup fix: removed the retired `src/app/api/auth/[...nextauth]/route.ts` stub because it collided with Better Auth's `[...all]` route and prevented Next.js from starting. Application vulnerabilities above were preserved as findings; assertions were not weakened to hide them. No schema, migration, financial service or trigger was modified.

Review of the added artifacts found no blocking violations: expected money uses integer minor units; fixture credentials are local/ignored; tests use isolated data; cloud templates are empty; no financial trigger is bypassed. Existing blocking application findings are listed above. There were no unanswered product-policy questions; the repository's documented permissions and money rules supplied the expected behavior.

The Postman setup scaffold added an API skill reference to `AGENTS.md`; project rules remain authoritative. Its generic instruction to make the implementation pass was scoped to this user's audit request: this task adds tests and reports vulnerabilities, rather than silently repairing all reviewed application behavior.

Not verified: deployed behavior, exhaustive fuzzing/load testing, browser-based CSRF/XSS exploitability, real email delivery, Google OAuth, verification/reset-token flows, pre-hijack/account-linking behavior, group lifecycle, or a production database. Passing the concurrent-edit sample does not establish race freedom. This is not an exhaustive penetration test.
