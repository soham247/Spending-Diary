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