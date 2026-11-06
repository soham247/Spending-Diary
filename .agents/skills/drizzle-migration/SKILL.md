---
name: drizzle-migration
description: How to change src/lib/db/schema.ts, generate migrations, write custom trigger migrations, run checks, and keep the deferred balance trigger alive. Use this skill whenever a task involves adding a table, column, index, check constraint, enum, trigger, or any schema change, even if the user only says "add a field" or "add an index".
---

# Drizzle migration

`src/lib/db/schema.ts` is the single source of truth. `drizzle/` holds generated SQL migrations and custom trigger migrations. **Never edit generated SQL or snapshot files by hand.**

AGENTS.md is the authority. This skill is the order of work. If anything conflicts, AGENTS.md wins.

## 0. Before you start

Read `docs/schema.md` for the table you are changing and its invariants. Check `docs/decisions.md` for any resolved ambiguity. If the intent is unclear — especially for money tables — ask and record the answer in `docs/decisions.md`.

## 1. Two connection strings, two purposes

| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | The app (pooled) | Runtime queries via pg Pool |
| `DIRECT_URL` | Drizzle Kit only | Migrations must bypass the pooler |

`drizzle.config.ts` reads `DIRECT_URL`. Never run migrations against the pooled URL. Always confirm `DIRECT_URL` points at a scratch or dev database before running `migrate`.

## 2. Editing the schema

All changes go in `src/lib/db/schema.ts`. Rules:

- **Row amounts** → `integer` (Drizzle `integer()`). Max ≈ ₹2.1 crore per row.
- **Balance cache** → `bigint({ mode: "bigint" })`. Convert to number with `toSafeNumber()` at the API edge only.
- **IDs** → `text("id").$defaultFn(() => createId())` using `@paralleldrive/cuid2`. Ledger entries use `bigserial` for insert speed.
- **Timestamps** → `timestamp("created_at", { withTimezone: true })`.
- **Expense/settlement dates** → `date("date", { mode: "string" })` — stays a `YYYY-MM-DD` string, never a `Date` object.
- **Pair keys** (`friendships`, `balances`) → declare a `check()` constraint `user_low_id < user_high_id`. Always set via `orderPair()` at runtime.
- **Soft delete** → `timestamp("deleted_at", { withTimezone: true })` nullable. No hard deletes on money tables.
- **Foreign keys on money tables** → `{ onDelete: "restrict" }` — never cascade or set null.
- **CHECK constraints and partial indexes** → declare in `schema.ts` inside the table's `(t) => [...]` extras array.
- **Deferred triggers** → these cannot be expressed in Drizzle; put them in a custom migration (step 4).
- **Better Auth tables** → regenerate with the Better Auth CLI after changing auth options; then reconcile with `schema.ts`.

## 3. Generate the migration

After editing `schema.ts`:

```sh
npx drizzle-kit generate
```

This produces a new numbered `.sql` file in `drizzle/`. Review it:

- Confirm every new column has the right type and default.
- Confirm every new `NOT NULL` column either has a default or you are adding it to a table with no existing rows.
- Confirm `onDelete: "restrict"` on every money foreign key.
- Confirm no `DROP` statement appears unless you explicitly removed something from the schema.
- Confirm the deferred balance trigger (`0001_balance_deferred_triggers.sql`) is **not touched** by the generator. If it appears in the diff, restore it immediately.

Then check for drift:

```sh
npx drizzle-kit check
```

This must exit 0 (no pending changes, no drift) after your migration is generated.

## 4. Custom migration for triggers (and anything Drizzle cannot express)

Use a custom migration for:

- `DEFERRABLE INITIALLY DEFERRED` constraint triggers
- `CREATE FUNCTION` / `CREATE TRIGGER`
- Anything the generator cannot represent

```sh
npx drizzle-kit generate --custom --name=<descriptive-name>
```

This creates an empty numbered `.sql` file. Write the SQL inside it. The existing deferred balance trigger lives in `drizzle/0001_balance_deferred_triggers.sql`. Your new file gets the next number.

Structure of a trigger migration:

```sql
-- Custom migration: <what this does>
-- Run once against a direct connection.

CREATE OR REPLACE FUNCTION my_check_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- ... validation logic ...
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER my_trigger
  AFTER INSERT OR UPDATE ON my_table
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION my_check_fn();
```

Write an integration test in `tests/integration/triggers/` that:
1. Connects to the test database (name must end in `_test`).
2. Inserts a valid row → expects success.
3. Violates the constraint → expects the transaction to roll back with the trigger's error.

## 5. Apply the migration

Against a **scratch or dev** database using the direct connection:

```sh
npx drizzle-kit migrate
```

Only `DIRECT_URL` is used. Never run this against production unless in a planned deployment.

## 6. The balance trigger — never break it

`drizzle/0001_balance_deferred_triggers.sql` installs two deferred constraint triggers:

- `trg_participants_balance_check` — fires on `expense_participants`, checks `SUM(paid) = SUM(owed) = expense.amount` at commit time for non-deleted expenses.
- `trg_expenses_balance_check` — fires on `expenses`.

**You must never:**
- Drop or disable either trigger.
- Weaken the trigger by adding `ON DELETE CASCADE` to `expense_participants`.
- Add an exception path that skips the trigger for any "special" expense type.

If the trigger fires unexpectedly, the bug is always upstream — in split calculation, a missing participant row, or a rounding error. Fix the upstream bug, not the trigger.

Integration tests for the trigger live in `tests/integration/triggers/balance-triggers.test.ts`. Run them after any schema change that touches `expenses` or `expense_participants`:

```sh
npx vitest run --project integration
```

## 7. Done checklist

- [ ] `schema.ts` is the only file edited (no hand-edits to `drizzle/*.sql` or `drizzle/meta/`)
- [ ] `npx drizzle-kit generate` run; new `.sql` file reviewed
- [ ] `npx drizzle-kit check` exits 0
- [ ] Balance trigger migration (`0001_*.sql`) is unchanged
- [ ] Custom migration written for any trigger or function (step 4)
- [ ] Integration test added for any new trigger or constraint
- [ ] Migration applied to a scratch database with `npx drizzle-kit migrate` using `DIRECT_URL`
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npx vitest run --project integration` passes (all trigger tests)
