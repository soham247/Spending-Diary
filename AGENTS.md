# AGENTS.md

Standing instructions for any AI agent (Claude Code, Cursor, Antigravity, etc.)
working in this repository. Read this in full before making changes.
Project context lives in `docs/` — read the relevant doc before implementing
a new entity, screen, or flow (see "Reference docs" at the bottom).

## What this project is

Spending Diary: an app for splitting shared expenses with
friends and groups (trips, flats, couples), combined with a personal spending
diary. Users log expenses, choose who paid and how it splits, see who owes
whom, and settle up (UPI deep link or cash). Personal expenses feed the same
spending insights. Full requirements: `docs/prd.md`.

## Tech stack — do not deviate without asking

- Next.js (App Router), React 19, TypeScript, strict mode on.
- PostgreSQL via Drizzle ORM over `pg` (node-postgres), connected through the
  provider's pooled connection string. The schema lives in
  `src/lib/db/schema.ts`, with CHECK constraints and partial indexes declared
  in it. Raw SQL (`sql` template or a custom migration) only for what Drizzle
  can't express: deferred triggers (custom migrations in `drizzle/`) and the
  atomic balance upsert (inside `src/lib/domain/`). No HTTP or stateless
  database drivers — money writes need interactive transactions.
- Better Auth (Drizzle adapter) for authentication: Google sign-in + email and
  password, with required email verification. Verification and password-reset
  emails go through our own SMTP via Nodemailer. No magic links, no phone auth.
- TanStack Query for all server state on the client. Zustand only for
  ephemeral UI state (open sheets, draft form state) — never for server data.
- shadcn/ui for components, Tailwind for styling, lucide-react for icons.
- Zod for all input validation (forms and API route payloads).
- Web Push (VAPID, self-hosted) for notifications. No paid SMS/WhatsApp APIs.
- Deployed to Vercel (Phase 1). Everything in Phase 1 must run on free tiers.

## Skills

Skills live in `.agents/skills/`. Before starting a task, check the table and
read the matching `SKILL.md` first. Several can apply to one task.

| When the task involves | Use |
|---|---|
| Creating, editing, deleting or restoring an expense or settlement; splits; ledger; balances | `add-money-write` |
| Adding or changing anything under `src/app/api/` | `add-api-route` |
| Changing `src/lib/db/schema.ts`, adding a migration, a trigger, a check constraint or an index | `drizzle-migration` |
| Finishing any task that touches money, queries, routes, hooks or UI | `money-review` |
| React/Next.js components, data fetching, bundle or render performance | `vercel-react-best-practices` |
| Component structure, compound components, variants, props design | `vercel-composition-patterns` |

**Precedence:** this file overrides every installed skill. If a skill
conflicts with a rule here, follow this file and say so in your report. Known
conflicts:

- Use TanStack Query, never SWR (ignore `client-swr-dedup`).
- Use route handlers and domain services, never Server Actions, for data and
  money writes (ignore `server-auth-actions`).
- Do not add `localStorage` persistence for server data.

## Non-negotiable domain rules

These come from `docs/prd.md` and `docs/schema.md` and are easy for an agent
to violate by taking the "obvious" shortcut. Don't.

1. **Money is an integer in minor units (paise).** ₹120.50 is `12050`.
   Row amounts are `integer` in Postgres, the balance cache is
   `bigint({ mode: "bigint" })`. Never use floats, never `parseFloat` a
   user-typed amount, never do money math on decimals. Convert only at the
   edges with `toMinor()` (string input → integer) and `formatMoney()`
   (integer → display string). In JSON, money is always an integer in minor
   units.
2. **Every expense balances exactly.** `SUM(participant.paid) =
   SUM(participant.owed) = expense.amount`. This is validated in the Zod
   schema AND enforced by a deferred Postgres constraint trigger. Never
   disable or work around the trigger — if it fires, the bug is upstream.
3. **Splitting and rounding happen in exactly one place:**
   `src/lib/domain/splits.ts`. Equal/percentage/share splits use
   largest-remainder rounding so shares always sum to the total. Never
   compute a share in a component, a hook, or a route handler.
4. **Balances are derived, never hand-edited.** `ledger_entries` is the
   source of truth and is append-only: a correction voids old entries
   (`voided_at`) and inserts new ones. `balances` is a cache, written only
   by `src/lib/domain/ledger.ts` inside the same transaction as the ledger
   write. No other code path may insert, update, or delete a `balances` row.
   The one sanctioned exception is `mergePlaceholder()` in
   `src/lib/domain/merge.ts`.
5. **Every money write is one transaction through a domain service.**
   Creating, editing, deleting, restoring an expense, and recording a
   settlement all go through `src/lib/domain/*` using `db.transaction`.
   Functions that run inside a transaction take a `tx: DbTx` argument instead
   of importing `db`. Route handlers never write money tables directly.
   Create endpoints require an `Idempotency-Key` header.
6. **Edits use optimistic concurrency.** Editing an expense requires the
   `version` the client last saw. On mismatch return `409` — never silently
   overwrite another member's change.
7. **Authorization is by construction, not by memory.** Every function in
   `src/lib/db/queries/` takes `viewerId` as its first argument and scopes
   its query to rows the viewer may see (group membership or direct
   participation). Every write calls a guard from `src/lib/auth/guards.ts`
   before touching data. A query that takes no `viewerId` is a bug.
8. **No hard deletes on financial data.** Expenses and settlements are
   soft-deleted (`deleted_at`) and restorable. Groups are archived. Users are
   anonymized, never deleted: anonymizing also deletes their credential and
   social `accounts` rows and their sessions, and replaces their email with a
   `.invalid` address. Foreign keys on money tables use
   `{ onDelete: "restrict" }`.
9. **"Spending" means the user's owed share, not what they paid.** Insights
   and budgets sum `participant.owed` on non-deleted expenses. Settlements
   are never spending.
10. **Never sum across currencies.** Balances are keyed by currency. In
    Phase 1 a group has one currency; show per-currency lines if a user has
    more than one, never a converted total.
11. **Placeholder users can't sign up, sign in, reset a password, or get
    email.** Invited-but-unregistered people are `status = INVITED` users with
    an address on the reserved `.invalid` domain. The mail layer refuses
    `.invalid` recipients (case- and whitespace-normalized), and sign-up
    rejects `.invalid` addresses. A placeholder becomes real only through an
    invite claim.
12. **Phone numbers are unverified contact info.** They are not unique and
    are never used to log in or to auto-match accounts.
13. **Canonical pair ordering.** Any table keyed by a pair of users
    (`friendships`, `balances`) stores `user_low_id < user_high_id`. Use the
    `orderPair()` helper — never hand-order IDs.
14. **Credentials belong to Better Auth.** Never hash, compare, store, or
    log a password yourself. Never log auth request or response bodies, reset
    tokens, or verification URLs. Email verification is required before
    sign-in. Accounts link only through a verified email, and a password set
    through an unverified sign-up must never work once the real owner verifies
    by another method.

## Workflow

Follow these steps for every task, in order. Do not skip a step because the
change looks small.

### 1. Understand

- Read the docs listed in "Before implementing a new feature" below.
- Read the matching skills from the Skills table.
- If anything touching money, balances, invites, authentication or
  authorization is ambiguous, ask. Record the answer in `docs/decisions.md`.

### 2. Plan

- For anything beyond a one-file change, state a short plan first: files to
  create or change, the domain function involved, and the tests you will add.
- Reuse existing domain functions, hooks, validation schemas and
  components before creating new ones.

### 3. Implement

- Write the smallest change that satisfies the requirement. No unrelated
  refactors, no drive-by formatting.
- Order of work for a feature: Zod schema → pure domain logic and tests →
  domain service → route handler → `lib/api` wrapper → hook → UI.
- Schema changes: use the `drizzle-migration` skill. Edit
  `src/lib/db/schema.ts`, run `npx drizzle-kit generate`, put deferred
  triggers in a custom migration (`npx drizzle-kit generate --custom --name=...`),
  keep `{ onDelete: "restrict" }` on money tables, and never weaken the
  balance trigger. Never hand-edit generated SQL or snapshot files, and never
  run `drizzle-kit push` against a shared or production database.
- Changes to Better Auth options or plugins: re-run the Better Auth CLI
  `generate` and reconcile the result with `src/lib/db/schema.ts`.

### 4. Verify

Run these before reporting a task done. Use the project's package manager
(`npm` shown; use `pnpm` or `yarn` if the repo does).

```
npx drizzle-kit generate   # only if schema.ts changed; must show no pending changes after your migration is created
npx drizzle-kit check      # only if schema.ts or drizzle/ changed
npx tsc --noEmit
npx eslint .
npx vitest run
npm run build              # for changes to routes, config, or the app shell
```

- If `package.json` has `typecheck`, `lint`, `test` or `verify` scripts, use
  those instead. If they are missing, add them so the commands above are one
  step.
- Migrations are applied to a scratch database first (using `DIRECT_URL`,
  not the pooled URL), and the balance-trigger tests run against it.
- Fix every error and warning your change introduced. Do not report done
  with a failing check.
- Fix the cause. Never silence a failure with `// @ts-ignore`,
  `@ts-expect-error`, `eslint-disable`, `any`, skipped or deleted tests,
  loosened `tsconfig` or lint rules, or by disabling a database trigger.
- If a failure was already there before your change, say so in your report
  instead of hiding it or fixing it silently.
- ESLint must enforce the architecture rules. If they are not configured yet,
  add them: no `drizzle-orm`, `pg`, or `@/lib/db/*` imports in `src/app/**` or
  `src/components/**`, and no `fetch` or `useQuery`/`useMutation` in
  components.

### 5. Review

- Run the `money-review` skill on your diff. Fix every "Blocking" finding.
- For UI changes, check loading, empty and error states against
  `docs/design.md`, and run `web-design-guidelines` on the screen.

### 6. Report

End with a short summary:

- What changed and which files.
- Which checks you ran and their results (pass or fail, with the failing
  output if any).
- Any rule or skill conflict you resolved, and any question you left open.
- Anything you did not verify, such as flows that need a browser or a
  database you could not run.

## Folder structure

`src/` layout. `docs/`, `drizzle/`, and config files stay at the repo root.

```
.agents/skills/              installed agent skills
drizzle.config.ts            Drizzle Kit config (uses DIRECT_URL for migrations)
drizzle/                     generated SQL migrations + custom trigger migrations
src/
  middleware.ts              redirects only; real authorization is in guards
  app/
    (auth)/
      login/                 sign in and create account, Google + email/password
      verify-email/          verification result and resend
      forgot-password/
      reset-password/
    (app)/                   authenticated app shell
      home/
      groups/
        [groupId]/
      friends/
        [userId]/
      expenses/
        [expenseId]/
      activity/
      insights/
      settings/
    j/[token]/               public invite landing page
    api/
      auth/[...all]/         Better Auth handler — do not add logic here
      expenses/
      settlements/
      groups/
      invites/
      balances/
      ...
  components/
    ui/                      shadcn-generated — do not hand-edit, use the CLI
    <feature>/               composed feature components
                             (e.g. components/expense/ExpenseRow.tsx)
  lib/
    auth/
      auth.ts                Better Auth server config
      auth-client.ts         Better Auth browser client
      guards.ts              assertGroupMember, assertCanEditExpense, ...
    db/
      client.ts              pg Pool + Drizzle singleton; exports db, DbTx
      schema.ts              Drizzle schema — single source of truth for tables
      queries/               read-only queries, one file per entity
    domain/                  all money logic and every money write
      splits.ts              split + rounding (pure)
      ledger.ts              expense → ledger edges, balance cache writes
      simplify.ts            debt simplification (pure)
      expenses.ts            create / edit / delete / restore
      settlements.ts
      invites.ts
      merge.ts               placeholder → real user merge
    api/                     thin typed fetch wrappers, one file per entity
    validation/              Zod schemas, one file per entity
    money/                   to-minor.ts, format-money.ts, currency.ts
    mail/                    SMTP transport + templates (verify, reset)
    push/                    web-push sending
    utils/                   dates, order-pair, etc.
    query-keys.ts            centralized TanStack Query key factory
  hooks/
    use-<entity>.ts          all query + mutation hooks for that entity
tests/                       integration tests (balance triggers, guards)
docs/                        see "Reference docs" below
AGENTS.md
```

shadcn's CLI writes to `@/components` and `@/lib/utils` by default — confirm
`components.json` points at the `src/` paths before your first `shadcn add`.

Routes reachable without a session: `/login`, `/verify-email`,
`/forgot-password`, `/reset-password`, `/j/[token]`, `/api/auth/*`, static
assets, and the push service worker. Keep the middleware matcher in sync.

## Conventions

- **Components:** PascalCase filenames matching the exported component
  (`ExpenseRow.tsx`). One component per file. Compose from `components/ui`
  primitives rather than styling raw HTML — if a shadcn primitive doesn't
  exist for something, add it via the shadcn CLI before hand-rolling it.
- **Hooks / utils / queries / domain:** kebab-case filenames
  (`use-group-balances.ts`, `format-money.ts`).
- **Validation schemas live once, in `lib/validation/`,** and are imported
  by both the client form and the route handler — never redefine a shape.
- **No business logic in components.** Splits, balances, simplification, and
  permission decisions live in `lib/domain/` or `lib/db/queries/`.
  Components call a hook and render the result.
- **Domain functions in `splits.ts`, `ledger.ts`, `simplify.ts` are pure**
  (no `db`, no I/O) and have unit tests plus property-based tests
  (`fast-check`) asserting that totals are preserved.
- **Route handlers are thin:** authenticate → parse with Zod → call one
  domain function or query → return. No `db` or `drizzle-orm` imports in
  route files.
- **Minimal comments.** Add comments only when absolutely necessary, and
  keep each comment to a single line.

### Database conventions (Drizzle)

- `client.ts` keeps one `pg` Pool, cached on `globalThis` in development, with
  `max` of 1 or 2 per serverless instance in production, using the provider's
  pooled connection string. Migrations use a separate direct connection
  (`DIRECT_URL`).
- Row amounts are `integer`, the balance cache is `bigint({ mode: "bigint" })`
  and the ledger id is `bigserial`. Convert `bigint` values with
  `toSafeNumber()` at the API edge.
- Expense and settlement dates use `date(..., { mode: "string" })` so they stay
  `YYYY-MM-DD` strings. Timestamps use `{ withTimezone: true }`.
- Application table IDs are cuid2 strings from `$defaultFn(() => createId())`.
- CHECK constraints and partial indexes are declared in `schema.ts`.
  Deferred triggers live in custom migrations and have integration tests.
- Export `type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0]`
  from `client.ts` and pass `tx` into domain helpers.
- The balance upsert uses `onConflictDoUpdate` with a `sql` expression that
  adds to the existing amount, inside the same transaction as the ledger
  insert, with pair keys sorted to avoid deadlocks.

### API conventions

- Success: `{ data: ... }`. Error: `{ error: { code, message, fields? } }`.
- Status codes: `400` validation, `401` unauthenticated, `403` not allowed,
  `404` not found or not visible to the viewer (never reveal which),
  `409` version conflict or duplicate idempotency key with a different body,
  `422` domain invariant violated.
- Money fields are integer minor units. `bigint` values are converted with
  `toSafeNumber()`, which throws if outside the safe integer range.
- Dates of expenses are calendar dates (`YYYY-MM-DD`), not timestamps.

### Styling & design tokens

Read `docs/design.md` before building any screen.

- **No arbitrary values for color, and no opacity-modified semantic tokens.**
  `bg-[#e7f5f3]`, `text-[#333]`, `bg-muted/80`, `text-foreground/60` are
  all disallowed. Every color must be an existing semantic token —
  `bg-muted`, `text-credit`, `bg-debit-muted`, `border-border`, etc. These
  rules apply to feature code. Do not rewrite shadcn-generated files in
  `components/ui` to satisfy them.
- **If the token you need doesn't exist yet, add it — don't inline a value:**
  - A new semantic color → add a CSS variable in `globals.css` and map it in
    the `@theme inline` block, then use the new token name.
  - A new *look* for an existing component → add a variant to that
    component's `cva()` definition rather than a one-off className.
- **Money color is meaning, not decoration.** `credit` (you are owed) and
  `debit` (you owe) are used only on amounts and balance indicators, always
  paired with words ("owes you", "you owe") so meaning never depends on
  color alone. `destructive` is for destructive actions, never for "you owe".
- **All amounts render through `<Money />`.** It applies `tabular-nums`,
  sign-aware color, and workspace-independent currency formatting. Never
  format money inline.
- Same reasoning extends to arbitrary spacing/sizing (`mt-[13px]`) — stick
  to the Tailwind scale unless the scale itself is extended deliberately.

### Data fetching (TanStack Query)

- **Components never call `useQuery`/`useMutation` directly.** Server state
  is accessed only through domain hooks in `hooks/`.
- **One file per entity in `hooks/`**, holding every query and mutation for
  that entity — `hooks/use-expenses.ts` exports `useGroupExpenses()`,
  `useExpense(id)`, `useCreateExpense()`, `useEditExpense()`,
  `useDeleteExpense()`, `useRestoreExpense()`.
- **Naming:** queries are nouns (`useBalances`, `useGroup`), mutations are
  verb-prefixed (`useCreateExpense`, `useSettleUp`, `useClaimInvite`).
- **Hooks call `lib/api/<entity>.ts`, never `fetch` directly.**
- **Query keys come from one factory, `lib/query-keys.ts`** — never an
  inline array on either the read or the invalidate side:

  ```ts
  export const queryKeys = {
    me: () => ["me"] as const,
    balances: {
      overall: () => ["balances"] as const,
      group: (groupId: string) => ["group", groupId, "balances"] as const,
      friend: (userId: string) => ["friend", userId, "balances"] as const,
    },
    groups: {
      all: () => ["groups"] as const,
      detail: (groupId: string) => ["group", groupId] as const,
      expenses: (groupId: string) => ["group", groupId, "expenses"] as const,
      activity: (groupId: string) => ["group", groupId, "activity"] as const,
    },
    expenses: {
      detail: (expenseId: string) => ["expense", expenseId] as const,
    },
    insights: {
      month: (month: string) => ["insights", month] as const,
    },
  };
  ```

- **Every money mutation invalidates balances.** Creating, editing,
  deleting, or restoring an expense, and recording a settlement, must
  invalidate `balances.overall()` plus the affected group/friend keys.
- **Optimistic updates** are allowed for list rows (add, delete with undo)
  but never for balance totals — balances always come from the server.

## Before implementing a new feature

1. Check `docs/prd.md` for the requirement and its acceptance criteria.
2. Check `docs/decisions.md` — the ambiguity you're about to guess on may
   already be resolved there.
3. Check `docs/schema.md` for the relevant tables and invariants before
   writing a migration.
4. Check `docs/design.md` for the screen, states, and components to use.
5. If none of the above answers it, ask rather than assume — especially for
   anything touching money, balances, invites, authentication, or
   authorization. Record the answer in `docs/decisions.md`.

## Reference docs

- `docs/prd.md` — product requirements and acceptance criteria
- `docs/design.md` — visual language, tokens, screens, and UI patterns
- `docs/schema.md` — database schema and the *why* behind it
  (Drizzle source of truth lives in `src/lib/db/schema.ts`)
- `docs/decisions.md` — dated log of resolved questionsv