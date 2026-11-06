---
name: money-review
description: Pre-merge audit of changes in Spending Diary against the project's non-negotiable domain rules - money as integer minor units, balanced expenses, single-place split rounding, ledger and balances integrity, transactions, authorization by viewerId, soft deletes, currency handling, placeholders, credentials, query keys, migrations and styling tokens. Use this skill before finishing any task that touches expenses, settlements, balances, queries, routes, hooks, schema or UI, and whenever the user asks to review, audit or check a change, even for small diffs.
---

# Review a change against the domain rules

Review the diff, not the whole repo. For each item, look for evidence in the changed files. Report findings grouped as **Blocking**, **Should fix** and **Notes**, each with file and line and the rule it breaks. If nothing is wrong, say what you checked. Do not invent problems.

## Money correctness

- Floats, `parseFloat`, `Number()` or decimal math on amounts. Amounts must be integers in minor units, converted only with `toMinor()` and `formatMoney()`.
- Any share, split or rounding computed outside `src/lib/domain/splits.ts` (components, hooks, routes).
- Totals that could stop balancing: `SUM(paid) = SUM(owed) = amount`. Any attempt to disable or bypass the deferred trigger.
- Money summed across currencies, or a converted total shown.
- "Spending" computed from what was paid instead of `participant.owed`, or settlements counted as spending.

## Ledger and balances

- Any insert, update or delete of `balances` outside `ledger.ts` (only `mergePlaceholder()` is exempt).
- Any update or delete of `ledger_entries` instead of voiding and re-inserting.
- A money write that is not one `db.transaction` through a domain service, a helper that uses the global `db` instead of the passed `tx`, or a route or component writing money tables directly.
- Hard deletes on expenses, settlements, groups or users. Foreign keys on money tables other than `onDelete: "restrict"`.
- Pair-keyed rows not ordered with `orderPair()` (`user_low_id < user_high_id`).

## Database and migrations

- `schema.ts` changed without a generated migration, or a generated SQL file or snapshot edited by hand.
- A new CHECK constraint or partial index that should be in the schema but was done in raw SQL, or a trigger weakened or dropped.
- `drizzle-kit push` used against a shared database, or migrations run through the pooled URL.
- An HTTP or stateless database driver introduced.
- `bigint` columns without `mode: "bigint"`, expense dates not in `mode: "string"`, timestamps without time zone.

## API and concurrency

- Create endpoints missing `Idempotency-Key`. Edit endpoints missing `version`, or a mismatch that overwrites instead of returning 409.
- `db`, `drizzle-orm` or `pg` imported in route files, business logic in routes, a redefined Zod shape.
- Wrong status codes, a 403 where 404 is required, or a response outside the `{ data }` / `{ error }` envelope.

## Authorization and authentication

- Any function in `src/lib/db/queries/` without `viewerId` as its first argument, or a query not scoped to what the viewer may see.
- A write that does not call a guard from `guards.ts` first.
- Object IDs taken from the request and used without a visibility check (IDOR).
- Password hashing, comparison or storage outside Better Auth, or logging of auth request bodies, reset tokens or verification URLs.
- Account deletion that leaves credentials, linked accounts or sessions behind.

## Identity and invites

- Email sent to `.invalid` addresses, sign-up allowed for `.invalid`, or a placeholder able to sign in or reset a password.
- Phone numbers treated as unique, verified, or used to log in or match accounts.

## Client code

- `useQuery` or `useMutation` called inside components, `fetch` inside hooks, or Zustand used for server data.
- Inline query-key arrays instead of `queryKeys`.
- A money mutation that does not invalidate `balances.overall()` plus the affected group and friend keys. Optimistic updates on balance totals.
- Business logic or permission decisions in components.

## Styling

- Arbitrary color values or opacity-modified semantic tokens in feature code (the rule does not apply to shadcn-generated files in `components/ui`).
- Amounts not rendered through `<Money />`. `credit` and `debit` used outside amounts and balance indicators, or without words. `destructive` used for "you owe".
- Hand edits to `components/ui` instead of the shadcn CLI. Arbitrary spacing values.

## Tests and tooling

- New arithmetic in `splits.ts`, `ledger.ts` or `simplify.ts` without unit and `fast-check` tests.
- Trigger or guard changes without integration tests.
- Typecheck, lint or tests not run or failing. Run them and report the result.

## Output format

1. Blocking (rule broken, must fix before merge)
2. Should fix
3. Notes
4. Checked and clean (short list of areas verified)