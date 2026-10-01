# Spending Diary — Database Schema

`src/lib/db/schema.ts` is the source of truth for table definitions. This doc explains the why: the money model, the invariants, and how each write flow touches the tables. Read it before writing a migration or a domain service.

## 1. The money model in one page

Money lives in three layers, each with one job:

```
 ┌──────────────────────────────┐
 │ expenses + expense_participants │   What the user entered. Editable.
 │ settlements                     │   (who paid, who owes, how much)
 └───────────────┬────────────────┘
                 │ derived at write time, same transaction
                 ▼
 ┌──────────────────────────────┐
 │ ledger_entries                  │   Pairwise debts. Append-only.
 │ (debtor → creditor, amount)     │   Source of truth for balances.
 └───────────────┬────────────────┘
                 │ applied atomically, same transaction
                 ▼
 ┌──────────────────────────────┐
 │ balances                        │   One row per pair per scope per
 │                                 │   currency. A cache: O(1) reads,
 │                                 │   always rebuildable from the ledger.
 └──────────────────────────────┘
```

Why three layers instead of computing balances on read: with multiple payers,
"who owes whom" is ambiguous (if Priya and Aman both paid, how much of Rahul's
share goes to each?). Resolving it once, deterministically, at write time and
storing the result as ledger entries makes every balance explainable and cheap
to read. The cache exists purely for speed and is verified nightly.

### Core rules

- **Amounts are integers in minor units (paise).** Row amounts are `Int`
  (max ≈ ₹2.1 crore per row). The balance cache is `BigInt` because it
  accumulates.
- **Every expense balances:** `SUM(paid) = SUM(owed) = expenses.amount`.
  Enforced by Zod and by a deferred constraint trigger (section 5).
- **The ledger is append-only.** Corrections set `voided_at` on old entries and
  insert new ones. Amounts on existing ledger rows are never updated.
- **Balances are written only by `lib/domain/ledger.ts`** (and `merge.ts`).
- **No hard deletes of financial data.** Soft delete with `deleted_at`;
  money foreign keys use `onDelete: Restrict`.
- **Credentials are Better Auth's.** Password hashes live only in
  `accounts.password`, written and read only by Better Auth. App code never
  touches them.

## 2. Entity overview

```
User ─┬─< Account (credential or Google), Session   (Better Auth)
      ├─< Friendship >─ User            (one row per pair)
      ├─< Contact                        (my nickname for someone)
      ├─< GroupMember >─ Group
      ├─< ExpenseParticipant >─ Expense ─< LedgerEntry
      ├─< Settlement ───────────────────< LedgerEntry
      ├─< Balance (as low or high)       (cache)
      ├─< Invite (as inviter / invitee placeholder)
      ├─< ActivityRecipient >─ Activity
      └─< PushSubscription
```

## 3. Conventions

| Convention | Rule |
|---|---|
| IDs | cuid2 strings from `$defaultFn(() => createId())`. Ledger entries use `bigserial` for insert speed and natural ordering. Better Auth tables keep the IDs Better Auth generates. |
| Table names | snake_case plural. Columns snake_case, declared as `text("created_at")` and so on, with camelCase TypeScript keys. |
| Row amounts | `integer` (max ≈ ₹2.1 crore per row). |
| Balance cache | `bigint({ mode: "bigint" })`, converted with `toSafeNumber()` at the API edge. |
| Timestamps | `created_at`, `updated_at` on every mutable table, `timestamp({ withTimezone: true })`. |
| Expense dates | `date(..., { mode: "string" })`, so they stay `YYYY-MM-DD` strings in local calendar terms. |
| Pairs | `user_low_id < user_high_id`, always set via `orderPair()`, enforced by a `check()` in the schema. |
| Scope | `scope_id` is the group ID, or the literal `"direct"` for non-group activity. Primary keys can't include NULL, so a sentinel keeps composite keys simple. |
| Currency | ISO 4217 code, `char(3)`. |
| Soft delete | `deleted_at` timestamp, nullable. Queries filter `isNull(deleted_at)` unless explicitly listing deleted items. |
| Foreign keys | Money tables use `{ onDelete: "restrict" }`. |

## 4. Tables

### 4.1 Auth (managed by Better Auth)

Generated with the Better Auth CLI. Don't rename or remove its core fields; add
app fields through `user.additionalFields` in `lib/auth/auth.ts` so the CLI and
the schema stay in sync. After any change to Better Auth options or plugins,
re-run the CLI `generate` and reconcile it with `src/lib/db/schema.ts`.

| Table | Purpose |
|---|---|
| `users` | People, including placeholders. Core: `id`, `name`, `email` (unique, stored lowercased), `email_verified`, `image`. App fields below. |
| `sessions` | Database sessions (90-day sliding). `token` unique. Listed in Settings → Devices. |
| `accounts` | Sign-in methods. A password user has one row with provider `credential` and a nullable `password` (the hash). A Google user has a row with Google's tokens. One user can have both. |
| `verifications` | Short-lived tokens for email verification and password reset. |

`email_verified` must be true before a password user can sign in. A Google
sign-in with the same verified email links to the existing user instead of
creating a second one.

App fields on `users`:

| Field | Type | Why |
|---|---|---|
| `status` | `ACTIVE \| INVITED \| DELETED` | `INVITED` = placeholder created by an inviter. Can't log in. |
| `phone` | `text NULL`, not unique | Unverified contact info only. Unique would let anyone lock a number. |
| `upi_id` | `text NULL` | Enables one-tap settle-up. |
| `default_currency` | `char(3)` default `INR` | Default for new groups and personal expenses. |
| `notification_prefs` | `jsonb` | Per-type switches, validated by Zod on read. |
| `merged_into_id` | `text NULL` | Set when a placeholder is claimed; keeps merges traceable. |
| `deleted_at` | `timestamptz NULL` | Account deletion anonymizes; the row stays for history. |

Placeholders get `email = placeholder+<id>@spendingdiary.invalid`. The
`.invalid` TLD is reserved and can never receive mail. The mail layer refuses
it, and sign-up rejects any `.invalid` address, so no one can create an account
that collides with a placeholder. Placeholders never have an `accounts` row, so
they can't sign in or reset a password. This satisfies Better Auth's required
unique email without a separate identity table.

### 4.2 `friendships`

One row per pair. `user_low_id`, `user_high_id` (composite PK), `status`
(`ACCEPTED | BLOCKED`), `blocked_by_id NULL`, `created_at`.

Why one row: the old schema stored A→B and B→A and only updated one of them,
so half the rows went stale. One canonical row can't drift.

### 4.3 `contacts`

`owner_id`, `user_id` (composite PK), `nickname`. The name an inviter typed for
someone ("Rahul college") belongs to that inviter, not to the person. Display
priority: owner's nickname → user's own name.

### 4.4 `groups` and `group_members`

`groups`: `id`, `name`, `type` (`TRIP | HOME | COUPLE | OTHER`), `currency`,
`simplify_debts` (default true), `created_by_id`, `archived_at NULL`.

`group_members`: `group_id`, `user_id` (composite PK), `role`
(`ADMIN | MEMBER`), `status` (`ACTIVE | LEFT | REMOVED`), `joined_at`,
`left_at NULL`.

Members are never deleted: a person who left still appears on old expenses and
may still carry a balance. Groups are archived, never deleted.

### 4.5 `invites`

| Field | Notes |
|---|---|
| `token_hash` | SHA-256 of the 128-bit token. The raw token exists only in the URL. |
| `type` | `DIRECT` (claims a placeholder), `GROUP_LINK`, `PERSONAL` (add me as friend). |
| `group_id NULL`, `inviter_id`, `invitee_user_id NULL` | `invitee_user_id` is the placeholder for `DIRECT`. |
| `max_uses NULL`, `use_count` | `DIRECT` = 1, links = unlimited unless set. Incremented with a conditional update to prevent over-redemption. |
| `expires_at NULL`, `revoked_at NULL` | Group links: 14 days. Direct: 30 days. Personal: none. |
| `claimed_by_id NULL`, `claimed_at NULL` | Who claimed a direct invite, shown to the inviter. |

### 4.6 `expenses`

| Field | Notes |
|---|---|
| `group_id NULL` | NULL for direct and personal expenses. |
| `kind` | `SHARED` or `PERSONAL`. Personal expenses have one participant and produce no ledger entries. |
| `description`, `category`, `notes NULL` | `category` is a fixed enum-like string in Phase 1. |
| `amount` | `Int`, minor units, `CHECK (amount > 0)`. |
| `currency` | Must equal the group's currency in Phase 1. |
| `split_type` | `EQUAL \| EXACT \| PERCENTAGE \| SHARES`. Stored so the edit form reopens the way it was entered. |
| `date` | `date`. |
| `created_by_id` | Explicit creator; never inferred from participant order. |
| `version` | Starts at 1, incremented on every edit. Edits must send the version they read. |
| `idempotency_key NULL` | `UNIQUE (created_by_id, idempotency_key)`. |
| `deleted_at NULL` | Soft delete; restorable. |

### 4.7 `expense_participants`

`expense_id`, `user_id` (composite PK), `paid Int >= 0`, `owed Int >= 0`,
`split_input numeric(12,4) NULL`.

Why one row with `paid` and `owed` instead of separate payments and shares
tables: every question the app asks ("what's my net on this expense?") needs
both numbers for the same person. One row halves the joins, and the composite
key makes duplicate participants impossible.

`split_input` stores what the user typed (40 for 40%, 2 for two shares) so
editing round-trips exactly. The computed `owed` is authoritative.

Participant rows represent the expense's current state and are replaced on
edit. History lives in the activity log (before/after snapshots) and in voided
ledger entries.

### 4.8 `settlements`

`id`, `group_id NULL`, `from_user_id` (sends money), `to_user_id` (receives),
`amount Int > 0`, `currency`, `method` (`CASH | UPI | OTHER`),
`external_ref NULL` (UPI reference if entered), `note NULL`, `date`,
`created_by_id`, `idempotency_key NULL`, `deleted_at NULL`.
`CHECK (from_user_id <> to_user_id)`.

A settlement produces one ledger entry with the debtor and creditor reversed:
Rahul paying Priya ₹500 is recorded as a ₹500 entry where Priya is the debtor
and Rahul the creditor, which cancels ₹500 of Rahul's debt.

### 4.9 `ledger_entries`

| Field | Notes |
|---|---|
| `id` | `BigInt` autoincrement. |
| `scope_id` | Group ID or `"direct"`. |
| `debtor_id`, `creditor_id` | `CHECK (debtor_id <> creditor_id)`. |
| `amount` | `Int`, `CHECK (amount > 0)`. |
| `currency` | |
| `expense_id NULL`, `settlement_id NULL` | Exactly one is set: `CHECK (num_nonnulls(expense_id, settlement_id) = 1)`. |
| `created_at`, `voided_at NULL` | Only non-voided entries count. |

### 4.10 `balances` (cache)

`scope_id`, `user_low_id`, `user_high_id`, `currency` (composite PK),
`amount BigInt`, `updated_at`. `CHECK (user_low_id < user_high_id)`.

**Sign convention:** `amount > 0` means **low owes high**; `amount < 0` means
high owes low. A ledger entry adds `+amount` when the debtor is the low ID and
`-amount` when the debtor is the high ID.

### 4.11 `activities` and `activity_recipients`

`activities`: `id`, `group_id NULL`, `actor_id`, `type`, `expense_id NULL`,
`settlement_id NULL`, `metadata jsonb`, `created_at`.

`activity_recipients`: `activity_id`, `user_id` (composite PK), `read_at NULL`.

Types: `EXPENSE_CREATED`, `EXPENSE_UPDATED`, `EXPENSE_DELETED`,
`EXPENSE_RESTORED`, `SETTLEMENT_CREATED`, `SETTLEMENT_DELETED`,
`MEMBER_JOINED`, `MEMBER_LEFT`, `MEMBER_REMOVED`, `GROUP_CREATED`,
`GROUP_UPDATED`, `INVITE_CLAIMED`.

`metadata` holds a typed, Zod-validated payload (for updates: a before/after
snapshot of amount, description, and participants).

Why fan-out recipients on write: "everything involving me" is the most-read
feed. Writing one recipient row per affected user makes it a single indexed
query, and `read_at` gives unread badges for free.

### 4.12 `push_subscriptions`

`id`, `user_id`, `endpoint` (unique), `p256dh`, `auth`, `user_agent`,
`created_at`, `last_used_at`. Deleted when the push service reports the
endpoint as gone (404/410).

### 4.13 Phase 2 tables (not in the first migration)

`recurring_expenses` (template JSON, schedule rule, `next_run_at`, `active`),
`comments` (`expense_id`, `author_id`, `body`), `budgets` (`user_id`,
`category NULL`, `month`, `amount`, unique on all three), and a
`receipt_key` column on `expenses`.

## 5. Constraints that live in SQL

Most constraints are declared in `schema.ts` with `check()` and are generated
into normal migrations:

- `expenses.amount > 0`, `settlements.amount > 0`, `ledger_entries.amount > 0`
- `expense_participants.paid >= 0` and `owed >= 0`
- `settlements.from_user_id <> to_user_id`
- `ledger_entries.debtor_id <> creditor_id`
- `num_nonnulls(expense_id, settlement_id) = 1` on `ledger_entries`
- `user_low_id < user_high_id` on `balances` and `friendships`

Only the deferred triggers below are raw SQL. They live in a custom migration
created with `npx drizzle-kit generate --custom --name=balance_deferred_triggers`.

```sql
CREATE FUNCTION check_expense_totals(eid text) RETURNS void AS $$
DECLARE total int; s_paid bigint; s_owed bigint;
BEGIN
  SELECT amount INTO total FROM expenses WHERE id = eid;
  IF total IS NULL THEN RETURN; END IF;
  SELECT COALESCE(SUM(paid), 0), COALESCE(SUM(owed), 0)
    INTO s_paid, s_owed FROM expense_participants WHERE expense_id = eid;
  IF s_paid <> total OR s_owed <> total THEN
    RAISE EXCEPTION 'Expense % unbalanced: amount=%, paid=%, owed=%', eid, total, s_paid, s_owed;
  END IF;
END $$ LANGUAGE plpgsql;

CREATE FUNCTION trg_participants_balanced() RETURNS trigger AS $$
BEGIN
  PERFORM check_expense_totals(COALESCE(NEW.expense_id, OLD.expense_id));
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE FUNCTION trg_expense_amount_balanced() RETURNS trigger AS $$
BEGIN
  PERFORM check_expense_totals(NEW.id);
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER expense_participants_balanced
AFTER INSERT OR UPDATE OR DELETE ON expense_participants
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION trg_participants_balanced();

CREATE CONSTRAINT TRIGGER expense_amount_balanced
AFTER INSERT OR UPDATE OF amount ON expenses
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION trg_expense_amount_balanced();
```

Both triggers are deferred, so they run at commit: a transaction can insert the
expense and its participants in any order, and an edit can replace every
participant row, as long as the totals match when it commits. The
`AFTER INSERT` on `expenses` also catches an expense committed with no
participants at all.

## 6. Indexes

| Index | Serves |
|---|---|
| `expenses (group_id, date DESC, id DESC) WHERE deleted_at IS NULL` | Group expense list with cursor pagination |
| `expenses (group_id) WHERE deleted_at IS NOT NULL` | "Deleted expenses" view |
| `expense_participants (user_id, expense_id)` | "Expenses I'm in", friend page, insights |
| `ledger_entries (scope_id, debtor_id, creditor_id) WHERE voided_at IS NULL` | Explaining a balance, rebuilds |
| `ledger_entries (expense_id)`, `ledger_entries (settlement_id)` | Voiding on edit/delete |
| `balances (user_high_id)` | Lookups where the viewer is the high ID (the PK covers the low side) |
| `group_members (user_id, status)` | "My groups" |
| `activity_recipients (user_id, activity_id DESC)` | Global activity feed |
| `activities (group_id, created_at DESC)` | Group activity feed |
| `settlements (from_user_id)`, `settlements (to_user_id)` | Friend page history |
| `invites (token_hash)` unique | Invite lookup |

Partial indexes are declared in `schema.ts` with `.where(sql`deleted_at IS NULL`)`
(or `IS NOT NULL`, or `voided_at IS NULL`) on the index definition, so they
come out of `drizzle-kit generate` instead of hand-written SQL.

## 7. Write flows

Every flow below is one `db.transaction(async (tx) => { ... })` inside
`src/lib/domain/`. Helpers take `tx` and never the global `db`.

### 7.1 Create expense

1. Guard: viewer is an active group member (group expense) or a friend of every
   participant (direct expense).
2. Zod has already checked `SUM(paid) = SUM(owed) = amount` and that all
   participants are allowed.
3. Insert `expenses` (with `idempotency_key`) and `expense_participants`.
4. `toLedgerEdges(participants)` → insert `ledger_entries`.
5. apply each edge with `tx.insert(balances).values(...).onConflictDoUpdate({ target: [...], set: { amount: sql`${balances.amount} + excluded.amount`, updatedAt: sql`now()` } })`, with edges sorted by pair key.
6. Insert `activities` and one `activity_recipients` row per participant (and
   per group member for group expenses), excluding the actor.
7. After commit: send web push (outside the transaction, failures ignored).

Personal expenses do steps 1–3 and 6 only.

`toLedgerEdges` computes each participant's net (`paid − owed`), then greedily
matches the largest debtor with the largest creditor, breaking ties by user ID.
It uses integer math only, is deterministic, and for a single payer produces
the obvious result: each other participant owes the payer their share.

### 7.2 Edit expense

1. Guard: viewer may edit. Compare `version`; mismatch → `409`.
2. Snapshot the current expense and participants for the activity log.
3. Void the expense's active ledger entries; apply their reversal to
   `balances`.
4. Replace participants, update the expense, increment `version`.
5. Generate new edges, insert ledger entries, apply to `balances`.
6. Activity `EXPENSE_UPDATED` with before/after snapshot.

### 7.3 Delete and restore

- **Delete:** set `deleted_at`, void active ledger entries, reverse them in
  `balances`, activity `EXPENSE_DELETED`.
- **Restore:** clear `deleted_at`, generate fresh edges from the current
  participants, insert and apply them, activity `EXPENSE_RESTORED`.

### 7.4 Record settlement

Insert `settlements`, insert one ledger entry (debtor = receiver,
creditor = sender), apply to `balances`, activity `SETTLEMENT_CREATED`.
Deleting a settlement voids that entry and reverses it.

### 7.5 Claim a direct invite (placeholder merge)

`mergePlaceholder(placeholderId, userId)` in `lib/domain/merge.ts`:

1. Move participant rows to the real user, summing `paid`/`owed` if both were
   on the same expense (`INSERT … ON CONFLICT DO UPDATE`).
2. Move group memberships (`ON CONFLICT DO NOTHING`), contacts, and
   friendships (re-ordering pairs).
3. Repoint ledger entries and settlements; void any entry where debtor and
   creditor are now the same person.
4. Delete and rebuild `balances` rows involving either ID from the ledger
   (section 8.4).
5. Mark the placeholder `DELETED` with `merged_into_id`, record
   `INVITE_CLAIMED`, set `invites.claimed_by_id`.

This is the one sanctioned exception to "ledger rows are never modified": the
merge changes identity, not amounts, and is fully recorded.

### 7.6 Leave or remove member

Leaving requires every balance for that user in the group's scope to be zero.
Removal by an admin is allowed with a non-zero balance; the membership becomes
`REMOVED` and the balance stays visible to everyone.

### 7.7 Delete account (anonymize)

One `db.transaction` in `lib/domain/`:

1. Require the user's current password, or a fresh Google sign-in if they have
   no password.
2. Set `users.status = DELETED`, `deleted_at = now()`, `name = 'Former member'`,
   clear `phone`, `upi_id`, `image`, and set
   `email = deleted+<id>@spendingdiary.invalid`. This frees the original email
   for a new account.
3. Delete the user's `accounts` rows (password hash and Google link), all
   `sessions`, and all `push_subscriptions`.
4. Leave expenses, participants, ledger entries, settlements, and balances
   untouched.
5. Reject deletion while any group balance is non-zero? Not in Phase 1: balances
   stay visible to the other person under the name "Former member".

## 8. Read queries

### 8.1 My balances with everyone

```sql
SELECT scope_id, currency,
       CASE WHEN user_low_id = $me THEN user_high_id ELSE user_low_id END AS other_id,
       CASE WHEN user_low_id = $me THEN -amount ELSE amount END AS net
FROM balances
WHERE (user_low_id = $me OR user_high_id = $me) AND amount <> 0;
```

`net > 0` means the other person owes me. Group by `other_id, currency` for the
friend view (summing across scopes); filter by `scope_id` for a group.

### 8.2 Group summary and simplified plan

Each member's net in the group is the sum of their signed balances within the
group's `scope_id`. The simplified plan is `toLedgerEdges` run on those nets
(`lib/domain/simplify.ts`). It produces at most n−1 payments. It is computed on
read and never stored.

### 8.3 Explain a balance

Active ledger entries between the two users in the scope, joined to their
expense or settlement, newest first.

### 8.4 Rebuild balances

```sql
INSERT INTO balances (scope_id, user_low_id, user_high_id, currency, amount, updated_at)
SELECT scope_id, LEAST(debtor_id, creditor_id), GREATEST(debtor_id, creditor_id), currency,
       SUM(CASE WHEN debtor_id < creditor_id THEN amount ELSE -amount END), now()
FROM ledger_entries
WHERE voided_at IS NULL
GROUP BY 1, 2, 3, 4;
```

The nightly reconciliation job runs this into a temporary table and compares it
to `balances`. Any difference is an alert, not an auto-fix.

### 8.5 Monthly spending (insights)

```sql
SELECT e.category, SUM(p.owed) AS spent
FROM expense_participants p
JOIN expenses e ON e.id = p.expense_id
WHERE p.user_id = $me
  AND e.deleted_at IS NULL
  AND e.date >= $monthStart AND e.date < $nextMonthStart
  AND e.currency = $currency
GROUP BY e.category;
```

Spending is `owed`, never `paid`. Settlements are not included.

## 9. Migrating from the current schema

The current app has `User`, `Friend` (with a running `amount`), `Expense`, and
`Payer`, using `Float` amounts.

0. The old database is Prisma-managed. Create the new tables with Drizzle
   migrations in a new schema or database, copy data with the steps below, and
   do not run both ORMs against the same tables.
1. Create the new tables alongside the old ones.
2. Users: copy `id`, `name`, `phone`. Existing users sign in again with Google,
   or set a new password through "Forgot password" on the email they used. If
   the old app stored bcrypt password hashes, they can be imported as
   `accounts` rows with provider `credential` by configuring Better Auth's
   custom `password.hash` and `password.verify`, then re-hashing on first
   sign-in. Check whether those hashes exist before deciding.

Imported users must still pass email verification unless their email was
already verified in the old app.
3. Friendships: collapse A→B and B→A rows into one canonical row.
4. Balances: the old running amounts can't be traced back to expenses. For each
   pair with a non-zero `Friend.amount`, create one direct `SHARED` expense
   described as "Opening balance (imported)" with the payer and owed amounts
   set to reproduce the balance, converted with `Math.round(amount * 100)`.
   Its ledger entry and balance row follow from the normal create flow.
5. Old expenses: import as history where the payer and participants can be
   determined; otherwise keep them read-only in an archive table. Do not let
   them generate ledger entries, or balances will be counted twice.
6. Run the reconciliation query; totals must match the opening balances before
   the old tables are dropped.