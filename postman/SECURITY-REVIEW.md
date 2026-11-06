# Security remediation — 2026-10-29

All six confirmed findings from the original API audit are fixed in this checkout. The original evidence is retained in [the baseline review](SECURITY-REVIEW.before-remediation.md) and [the baseline Postman output](results/2026-10-29-run.txt).

## Verified results

| Check | Result |
| --- | --- |
| Postman HTTP suite | 101 requests, 232 assertions passed, exit 0 |
| Unit and PostgreSQL integration tests | 113 passed, zero failed/skipped |
| TypeScript | Pass |
| ESLint | Pass with four pre-existing React hook warnings |
| Production build | Pass, including type checking |
| Full npm audit, including development dependencies | Zero vulnerabilities, exit 0 |
| Postman collection/environment and OpenAPI syntax lint | Pass |
| Better Auth schema generation | Completed and reconciled with the application schema |
| Drizzle generation/check | No pending schema changes; check passes |
| Generated migration on isolated PostgreSQL | Applied successfully; balance-trigger tests pass |

The passing Postman suite still includes 21 explicit 501 checks for 11 legacy route files. Those checks document unimplemented features; they do not establish that those features work. The test target was `http://127.0.0.1:3100` with a disposable PostgreSQL database and local SMTP fixture. Shared Postman files still default to `http://localhost:3000`, with each request appending `/api/...`.

## Fixes

| Finding | Resolution |
| --- | --- |
| S1: outsider expense/settlement mutations | Every domain mutation receives the viewer ID and calls transactional guards. Expense permissions require participation or current group-admin membership; settlement deletion requires either side of the payment. Unauthorized and missing objects return the same 404. |
| S2: forged participants and groups | Creates validate caller status, current group membership, participants, friendship/block rules, archived state and group currency before writing. Direct expenses must include the caller. |
| S3: payments increase debt | Settlement ledger entries now reduce the payer's debt. Tests verify partial payment, deletion reversal and concurrent replay. |
| S4: currency/financial edits leave stale ledger | Financial edits void old entries and rebuild participants, ledger and balances in one transaction. Unsupported currencies are rejected. |
| S5: duplicate create effects | The new idempotency table atomically records creator, operation, key, original request digest and result ID. Same-body concurrent retries reuse the ID; changed-body retries return 409. The digest remains valid after later edits or deletion. |
| S6: invalid financial input | Shared Zod validation enforces actual calendar dates, integer row bounds, unique/bounded participant lists, supported currency, and paid/exact-owed totals. Structural input errors return 400; domain balancing failures return 422. Missing keys and malformed JSON return 400. |

Additional fixes:

- Expense edits lock the row and compare the version inside the transaction. Concurrent edits produce one success and one 409. Delete/restore also lock and increment the version.
- Ledger allocation uses deterministic greedy matching and integer largest-remainder arithmetic. Property tests verify every participant's net, including multi-payer cases and integer-limit amounts.
- Balance updates are ordered by canonical user pair; API serialization checks the safe integer range.
- Group expense queries scope themselves to the viewer and use valid cursor pagination.
- Money hooks invalidate the overall balance and affected group/friend query namespaces. No optimistic balance totals were introduced.
- Auth signup fields now match Drizzle's property names. Verification is required before sessions are issued; inactive/placeholder accounts cannot sign in or reset credentials.
- Password reset consumes its token once and revokes old sessions. Rate limits use PostgreSQL and are tested across separate Better Auth instances.
- Linking a verified Google identity removes an unverified signup's credential through Better Auth's own adapter before granting access. Tests reject the old password and reject unverified provider email.
- The auth client uses the updated `requestPasswordReset` method. The React/Next.js compatibility change preserves the existing form flow.
- ESLint now enforces the repository's import/data-fetching boundaries. Application routes access read queries through a server-only API facade.
- Existing integration-test setup was repaired to read node-postgres `rows`, bind SQL correctly, and assert the actual PostgreSQL check-violation cause. The deferred trigger was not disabled or weakened.
- Tailwind's PostCSS integration now matches the existing v4 CSS. The deprecated `next lint` script was replaced with the ESLint CLI.

## Dependencies

Security-relevant versions include Next.js 15.5.28, React/React DOM 19.3.1, Better Auth 1.7.14, Drizzle ORM 0.45.4, Drizzle Kit 0.31.11, Axios 1.21.0, Zod 4.6.7, Nodemailer 10.3.0, Tailwind 4.3.3 and Vitest 5.0.5. Other dependencies were refreshed within their declared compatible ranges.

A patched PostCSS 8 override replaces Next.js's vulnerable nested copy, and esbuild is overridden to 0.28.2 for migration tooling. Generation, migration, build and tests were exercised with these versions. No `--force` or `--legacy-peer-deps` install was used. See [the current audit](results/dependency-audit.json); the original affected-package report is preserved separately.

Tested runtime: Node 24.13.0. Vitest 5 requires a supported modern Node runtime; check its engine requirements when changing CI runtimes.

## Migration and rollout

The generated migration is [0002_lowly_roxanne_simpson.sql](../drizzle/0002_lowly_roxanne_simpson.sql). It adds the idempotency table, aligns auth rate-limit constraints, and adds auth lookup indexes. It preserves money foreign keys and the original deferred balance-trigger migration. Auth generation was reconciled while keeping the project's plural table names, timezone timestamps, enums, currency type and ID conventions.

At the time of the remediation tests, it had been applied only to the isolated test database using its direct connection. Subsequently, on 2026-10-29, all three migrations were applied to the user's Supabase database through a verified direct connection after the user authorized replacing the old application data. See [the current V2 status](../docs/v2-status.md) and decision D-025. The pooler remains the runtime connection, not the migration target.

Historical keys without a retained request digest return 409 rather than risking duplication. Existing financial records have not been rewritten: audit any historical duplicated settlements or incorrect ledger/currency effects separately before correcting real data through domain services.

The missing local `BETTER_AUTH_SECRET` was generated in ignored `.env` without exposing the value. Each deployed environment still needs its own configured secret and working SMTP settings. Actual email delivery was exercised against a local SMTP fixture/in-memory mailbox, not a live mail account.

## Blocking and settlement policy

User-confirmed decision D-024 allows blocked friends to repay existing debt. Payments for blocked pairs must follow the existing debtor-to-creditor direction and cannot exceed that scope/currency's outstanding debt. The check locks the balance row, so concurrent payments cannot exceed the debt. Same-key replays still return the original result. New expenses involving a blocked friend remain prohibited. Accepted friendships retain the documented overpayment behavior.

## Review and remaining limits

Money review found no blocking issues in the remediation: money stays in integer minor units, writes are guarded and transactional, ledger corrections are append-only, balances are written only in `ledger.ts`, and soft deletion and canonical pairs are preserved. No tests were skipped or assertions relaxed to bless an insecure response.

The Postman accounting fixture now uses a separate INR group instead of unsupported USD. Currency-edit regressions require rejection and an unchanged INR expense/balance. This follows the pre-existing `SUPPORTED_CURRENCIES = ["INR"]` contract rather than expanding Phase 1 currency support.

Four existing React hook warnings remain in `AddExpenseForm.tsx` and `UserExpenses.tsx`. Legacy 501 routes remain unfinished. No browser redesign or unrelated legacy feature rewrite was included.

The baseline audit covered this checkout rather than production. Live Google signature verification, real email delivery, deployed hosting behavior, browser exploitability and exhaustive fuzz/load testing were not verified. Provider identity was simulated only in the integration tests; production uses Better Auth's Google verification. A clean npm audit covers known advisory matches, not every possible vulnerability.
