---
name: add-money-write
description: Procedure for adding or changing any operation that writes money data in Spending Diary - creating, editing, deleting or restoring an expense, recording or voiding a settlement, merging a placeholder, or anything touching ledger_entries, balances, expense participants or settlements. Use this skill whenever a task involves splitting, paying, owing, settling, balances, or a new endpoint or hook that mutates financial data, even if the user does not call it a "money write".
---

# Add or change a money write

AGENTS.md is the authority on the rules. This skill is the order of work. If anything here conflicts with AGENTS.md, AGENTS.md wins. Read `docs/prd.md` (acceptance criteria), `docs/schema.md` and `docs/decisions.md` for the operation first. If the behaviour is ambiguous, ask and record the answer in `docs/decisions.md`.

## Order of work

1. **Zod schema** in `src/lib/validation/<entity>.ts`.
   - Money fields are integers in minor units. No floats, no `z.coerce.number()` on user-typed amounts; parse strings with `toMinor()` at the form edge only.
   - Validate `SUM(paid) = SUM(owed) = amount` in the schema.
   - Editing requires `version`. Creating requires an idempotency key at the route level.

2. **Pure logic** in `src/lib/domain/` (`splits.ts`, `ledger.ts`, `simplify.ts`).
   - All split and rounding math goes through `splits.ts` with largest-remainder rounding. Never compute a share anywhere else.
   - Keep these functions pure: no `db`, no I/O.
   - Add unit tests and `fast-check` property tests asserting totals are preserved.

3. **Domain service** in `src/lib/domain/<entity>.ts`.
   - One `db.transaction(async (tx) => { ... })` per operation. The expense or settlement write, the ledger entries and the balance cache update happen in the same transaction. Helpers called inside take `tx: DbTx`, never the global `db`.
   - Corrections void old `ledger_entries` (`voided_at`) and insert new ones. Never update or delete ledger rows.
   - Only `ledger.ts` writes `balances` (exception: `mergePlaceholder()`). Use `onConflictDoUpdate` with a `sql` expression that adds to the existing amount, and process pair keys in sorted order to avoid deadlocks.
   - Use `orderPair()` for any pair-keyed row.
   - Soft delete only (`deleted_at`). Never hard delete money rows.
   - Call the guard from `src/lib/auth/guards.ts` before touching data.
   - Edits: compare `version`, throw a conflict error on mismatch, increment on success.
   - Creates: honour the idempotency key. Same key and same body returns the original result. Same key and a different body is a 409.

4. **Schema or migration** (only if a table changes). Use the `drizzle-migration` skill. Do not weaken the deferred balance trigger. If it fires, fix the code that produced the bad data.

5. **Route handler.** Use the `add-api-route` skill. The handler stays thin and never imports `db`.

6. **API wrapper and hook.** `src/lib/api/<entity>.ts`, then `src/hooks/use-<entity>.ts` using keys from `queryKeys`.
   - Invalidate `balances.overall()` plus the affected group and friend keys on success.
   - Optimistic updates are allowed for list rows, never for balance totals.

7. **UI.** Amounts render through `<Money />`. No money formatting inline, no logic in components.

## Done checklist

Run typecheck, lint and tests, then confirm:

- [ ] No floats or `parseFloat` on money anywhere in the diff
- [ ] Splits computed only in `splits.ts`
- [ ] Single `db.transaction`, ledger and balance write together
- [ ] No other code path writes `balances`
- [ ] Guard called, and every query used takes `viewerId` first
- [ ] Idempotency key and version conflict handled
- [ ] Soft delete, restorable, `onDelete: "restrict"` on any new FK
- [ ] Balances invalidated in the hook
- [ ] Property tests cover the new arithmetic
- [ ] Trigger integration tests still pass against a scratch database
- [ ] Spending reads `participant.owed`, and settlements are never counted as spending

Finish with the `money-review` skill.