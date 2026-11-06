# Decisions

Dated log of resolved questions. Newest at the bottom. Each entry states the
decision, the reason, and what it rules out. Agents: check here before
guessing, and add an entry when a question gets answered.

---

### D-001 · 2026-09-30 · Money as integer minor units
Store amounts as integers in paise (`Int` per row, `BigInt` for the balance
cache). Floats caused rounding errors in the old schema; integers are exact and
fast. Rules out `Float`, `numeric` arithmetic in JS, and `parseFloat` on input.

### D-002 · 2026-09-30 · Ledger plus balance cache
Balances are derived from an append-only `ledger_entries` table and cached in
`balances`, both written in the same transaction. The old running
`Friend.amount` couldn't be audited and drifted. Rules out computing pairwise
balances on read from expenses, and any other code writing `balances`.

### D-003 · 2026-09-30 · One participant row with `paid` and `owed`
Replaces separate payments and shares tables. Halves joins and prevents
duplicate participants via a composite key.

### D-004 · 2026-09-30 · Greedy allocation for multi-payer expenses
Participant nets are matched largest-debtor to largest-creditor, ties by user
ID. Integer-exact and deterministic. The same algorithm powers debt
simplification.

### D-005 · 2026-09-30 · Largest-remainder rounding for splits
Equal, percentage, and share splits distribute leftover paise one at a time in
a deterministic order so shares always sum to the total.

### D-006 · 2026-09-30 · No passwords: Google plus email magic link
Better Auth with Google OAuth and magic links. Phone OTP is not free (Firebase
requires a paid plan for SMS), so phone is not an auth method in Phase 1. Superseded by D-019 (email and password added, magic links dropped).

### D-007 · 2026-09-30 · Verification and password-reset email goes through our own SMTP
Nodemailer over our own SMTP on port 587/465, sending from our domain with
SPF, DKIM, and DMARC. No third-party email API. Self-hosted Postfix is ruled
out for login email due to deliverability.

### D-008 · 2026-09-30 · Magic links open a confirm page
The emailed link opens `/auth/confirm`, and only a button press consumes the
token, because email security scanners pre-open links. Superseded by D-019. No confirm page is needed: reset tokens are consumed on form submit, and verification only proves a mailbox the user owns.

### D-009 · 2026-09-30 · Phone numbers are unverified and not unique
Phone is contact info only. Without verification, a unique constraint would
let anyone lock someone else's number.

### D-010 · 2026-09-30 · Placeholders use `.invalid` emails
Invited-but-unregistered people are `INVITED` users with
`placeholder+<id>@spendingdiary.invalid`, satisfying Better Auth's required
email. The mail layer refuses `.invalid`. A separate `members` table was
considered and deferred as a larger refactor.

### D-011 · 2026-09-30 · Invite links are the claim proof
A direct invite link is single-use and claims its placeholder, merging history
into the claimer's account. The inviter is notified of who claimed it.

### D-012 · 2026-09-30 · Invites are sent from the user's own apps
The share sheet (WhatsApp first on most Android phones) sends invites. The
server never sends invite messages. Free, and a message from a friend converts
better than one from a business number.

### D-013 · 2026-09-30 · Keep Next.js route handlers as the backend
The bottleneck was the schema and business logic, not the framework. Revisit
if we need long-running workers beyond cron-triggered jobs.

### D-014 · 2026-09-30 · Prisma over Drizzle
The existing codebase uses Prisma. Raw SQL is used only for triggers, check
constraints, partial indexes, and atomic balance upserts.

### D-015 · 2026-09-30 · Phase 1 is free to run
All Phase 1 services run on free tiers. Web push replaces SMS/WhatsApp
notifications. The premium tier is deferred to Phase 3; before it charges
money, hosting moves off Vercel Hobby, which is for non-commercial use.

### D-016 · 2026-09-30 · One currency per group in Phase 1
Balances are keyed by currency and never summed across currencies. Multi-
currency expenses with rate snapshots are Phase 3.

### D-017 · 2026-09-30 · Participants and admins can edit expenses
Any participant of an expense, and any group admin, can edit or delete it.
Other group members can view only.

### D-018 · 2026-09-30 · Delete uses Undo, not confirmation
Expense and settlement deletes are soft and restorable, so the UI uses an Undo
toast instead of a confirmation dialog. Irreversible actions still confirm.

### D-019 · 2026-10-01 · Google plus email and password

Better Auth with Google OAuth and email and password. Magic links are dropped. Phone OTP stays out (D-006 reasoning still applies). Rules out magic-link sign-in, the /auth/confirm page, and the Better Auth magicLink plugin.

### D-020 · 2026-10-01 · Email verification is required before sign-in

emailAndPassword.requireEmailVerification is on. Without it, an attacker can register with a victim's email and a password of their own, and the victim's later Google sign-in would link to an account the attacker can already open. Verification and reset emails use the same .invalid guard as every other email. Sign-up rejects .invalid addresses. Rules out sign-in for unverified emails and any "verify later" mode.

### D-021 · 2026-10-01 · Accounts link only through a verified email

A Google sign-in and a password account with the same verified email resolve to one user. A Google-only user adds a password through Forgot password or Settings. A password set through an unverified sign-up must not work once the real owner verifies through Google; this needs an automated test. Rules out linking on unverified emails and creating a second user for the same email.

### D-022 · 2026-10-01 · Password policy and abuse limits

Minimum 10 characters, maximum 128, no composition rules, paste and password managers allowed. Hashing uses Better Auth's default (scrypt); no custom hashing. Reset links last 1 hour and work once, and a reset signs out all other devices. Rate limits on sign-in, sign-up, resend-verification and reset requests use database-backed storage, because in-memory counters do not work on serverless. A breached-password check is optional and not part of Phase 1.

### D-023 · 2026-10-01 · Drizzle over Prisma

Supersedes D-014. The data layer uses Drizzle ORM over node-postgres. Reasons: CHECK constraints and partial indexes are declared in the schema, the atomic balance upsert is typed (onConflictDoUpdate with a sql expression), bigint columns map cleanly, and the runtime is small. Raw SQL remains only for deferred triggers (custom migrations in drizzle/). Speed was not the deciding factor: Prisma 7 narrowed the gap and database time dominates a request. Rules out Prisma Client, prisma migrate, HTTP database drivers (they cannot run interactive transactions), and drizzle-kit push on shared databases. Add this line to the end of D-014: Superseded by D-023.

### D-024 · 2026-10-29 · Settling existing debt after blocking

Blocked friends may still record settlements for their existing debt. New expenses remain blocked. For blocked pairs, payments must run from the current debtor to the creditor and cannot exceed the outstanding per-currency debt; accepted friends retain the overpayment behavior in SET-5. This allows either side to record repayment without creating a new debt after blocking. Confirmed by the user during the security remediation.

### D-025 · 2026-10-29 · Replace the legacy Supabase application data for V2

The user confirmed that Supabase remains the database provider and that the old application data is not needed and may be replaced. Reuse the configured database, remove only the four identified legacy application tables (`Payer`, `expenses`, `friends`, `users`), and apply the repository's three Drizzle migrations through a verified direct connection. Keep the pooled runtime connection and all provider-managed schemas intact. This is a one-time authorized migration reset, not permission for future financial hard deletes.

### D-026 · 2026-10-29 · Collapsed payments during a placeholder claim

The user confirmed that if a placeholder and the claiming account are the two sides of the same settlement, the merge soft-deletes that settlement and voids its ledger entries. Original identities remain on these collapsed records for audit history, avoiding forbidden self-payments and self-edges. The placeholder row remains traceable through merged_into_id. Participant collisions combine paid and owed exactly; affected expenses reopen as exact splits so later edits preserve the merged allocations.

### D-027 · 2026-10-29 · Wrong invitation claims are reported for manual review

The user confirmed that Phase 1 records an inviter's wrong-claim report for manual review. Reporting does not reverse the identity merge or alter financial history. Automatic reversal requires a separately designed recovery policy.

### D-028 · 2026-10-31 · Payers may be outside the cost split

The user requested A paying INR 90 while B and C each owe INR 45. Participants are the union of payers and people sharing the cost. A payer may have owed = 0 and still counts as participating for authorization. The form checkboxes select cost sharing, independently of payment inputs. API participants accept includedInSplit, defaulting to true when omitted. Excluded participants have zero owed and zero percentage/share weight. The existing numeric split_input stores zero for excluded participants; included equal/exact participants retain null, and included percentage/share participants retain their positive weight. This preserves selection on edits without a migration, including tiny rounded shares of zero.

### D-029 · 2026-11-06 · Custom payments and former-member repayment

The user confirmed that payments remain separate settlements with no split or category and never count as spending. A payment belongs to Direct or exactly one group, without automatic allocation across scopes. Either party may record it. The form includes an optional note of up to 2,000 characters. For unrestricted parties, advances at zero balance, payments increasing existing debt and overpayments are allowed after confirmation showing the resulting balance; ordinary partial/full repayments need no extra confirmation. Existing payment-like expenses are not automatically converted, and payer-excluded expense splits remain valid.

Group payment counterparties include active members and former members with any nonzero pairwise group balance, including offsetting debts with zero aggregate net. If either party is a former member, only repayment of the existing pairwise debt is allowed, without overpayment or new debt. Former members may record their own repayments and delete/undo their payments after reaching zero, without regaining expense or general group access. Restoration rechecks current repayment restrictions. Blocked-pair restrictions remain in effect and archived groups remain read-only.


### D-030 - 2026-11-06 - Adopt the supplied shadcn theme and sidebar

The user explicitly selected a new light/dark OKLCH palette, burnt-orange
primary actions, matching chart colours, and the shadcn sidebar. Apply their
supplied values exactly, including sidebar tokens and alpha border/input
values. This supersedes the earlier green-grey surfaces, ink primary
buttons, and mobile bottom navigation. Retain the existing credit/debit
extension tokens and Money rendering so financial direction stays explicit.
Use the official CLI-generated Tailwind v4 sidebar and primitives; desktop
collapses to icons and mobile uses the sidebar Sheet. No financial or
authorization behaviour changes.
