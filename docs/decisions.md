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

### D-031 - 2026-11-07 - Let the Nova preset own component styling

The user requested that the app use shadcn components wherever possible and follow the selected b1FQgMFSC preset. Use radix-nova primitives, the selected Oxanium font, and the existing neutral/amber theme as the design system. Remove desktop control-height overrides and custom card surfaces; compose Cards, Tabs, Alerts, and Avatars instead. Preserve 44px mobile touch targets and intentional amount-input emphasis. This supersedes the earlier IBM Plex Sans typography and app-wide 44px desktop control sizing. Keep financial colors and Money rendering, existing domain behavior, and loading/error/empty states.

### D-032 - 2026-11-07 - Use shadcn Drawer for forms at every breakpoint

The user chose Drawer alone for form overlays on mobile and desktop rather than a responsive Drawer/Dialog combination. Use the official radix-nova Drawer generated by the shadcn CLI. Drawers open from the bottom, fill mobile width and use a centred constrained width on desktop. Share presentation and draft protection through FormDrawer, retain the existing sidebar Sheet, and leave financial services, validation and authorization unchanged. Payer and split editing stay within one expense Drawer; Close, Escape, handle drag and browser Back must protect edited drafts, and pending writes/UPI confirmation block dismissal. This supersedes the desktop Dialog prescription in design section 5.

### D-033 - 2026-11-07 - Temporarily pause Google authentication

The user requested that Google authentication be disabled for now, while retaining a disabled Continue with Google button with a recognizable Google icon on login and registration. Production Better Auth uses no social providers even when Google credentials are present. Email/password login, registration, email verification and password recovery remain active. Re-enabling Google is a future explicit change; no credentials or linked accounts are removed.

### D-034 - 2026-11-07 - One expense composer and participant picker

The user approved the researched add-expense UX proposal. Replace the mixed context dropdown with one searchable people/group picker inside the existing Drawer. Global Add starts personal, friend entry selects that friend and the viewer, and group entry selects all active members. Never select the first friend automatically. Keep amount, description, date, category and notes when switching people or groups. Changing the selection resets allocations to equal and payer to the viewer; explain this before applying when a custom split or payer would be replaced. Cancelling keeps the existing selection and allocations. Group selection stays scoped to that group's active members. Single-payer selection returns immediately to the form; multiple payers and payer-excluded splits remain available. Show participant chips and domain-derived debt previews. Keep existing services, guards, transactions, idempotency and edit concurrency.

### D-035 - 2026-11-08 - Open desktop form drawers from the side

The user requested side-opening drawers for desktop. Shared FormDrawer opens from the right at 768px and above, fills viewport height and keeps a max-w-2xl width. Mobile retains the bottom drawer and drag handle. Keep the same mounted form when resizing, scrollable body, sticky save actions, focus management and draft/pending-write dismissal guards. This supersedes D-032's desktop bottom-drawer presentation.

### D-036 - 2026-11-08 - Private friend discovery and explicit connection consent

The user approved one Add friend search bar: name and nickname search stays within accepted friends and active members of active shared groups; a full exact email can discover another active verified account only when that account enables email discovery. Discovery defaults off, including existing accounts. Search, request and personal connection previews expose no email, phone, UPI or money data. Hidden and absent accounts produce the same no-match result. No global name directory, public emails, usernames or phone matching are introduced.

Email discovery and personal links use the same pending-request lifecycle. Finding an account or opening a personal link never grants friendship, financial or group permissions. Only the recipient can accept, and crossed requests do not implicitly accept. Request writes recheck current discovery, shared-group or personal-link authority, active identity and blocks; IDs and stale search results do not confer permission. Turning email discovery off closes its pending incoming email-origin requests without changing existing friendships or requests initiated through shared groups or personal links. Revoking a personal link closes its pending requests. Declined non-link requests have a seven-day resend cooldown; a deliberately shared valid link remains usable. Search and request creation are rate-limited per viewer, and browser mutations reject untrusted origins.

Personal links now request a connection rather than immediately creating a friendship, superseding FR-1/INV-3's old automatic-connect behavior. Group links retain explicit Join group consent. Named placeholders and their single-use history-claim links stay separate and never auto-match registered identities. Claim notifications now identify the claimer by name without exposing their email; historical claim metadata is redacted at the activity API boundary, superseding INV-7's email disclosure. Existing financial permissions, ledger and balance rules remain unchanged.

### D-037 - 2026-11-09 - Adaptive workspace and mobile quick navigation

The user requested a sidebar-contained desktop toggle, independent content scrolling, better use of large screens and a floating mobile navigation pill. Keep the desktop collapse/expand control inside the sidebar, including its collapsed icon rail. Keep the page header outside the scrolling content area and expand the workspace to max-w-7xl, with People and Groups side by side on wide Home screens. On phones, expose Home, Spending, Groups and Friends in a labelled bottom pill; retain the complete sidebar menu for secondary destinations. Reserve bottom safe-area and content spacing, preserve keyboard focus and active-route semantics, and reset content scroll on route changes. This supersedes D-030's removal of bottom navigation and design section 5's narrow content cap. Financial services and permissions are unchanged.

References: [Material adaptive navigation](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns) for switching between mobile bottom navigation and larger-screen side navigation; [Spotify desktop redesign](https://newsroom.spotify.com/2023-06-20/spotify-desktop-experience-redesign-your-library-now-playing-views-customize/) for a persistent collapsible sidebar alongside the browsing workspace. The four-destination pill is Spending Diary's application of these patterns.

### D-038 - 2026-11-09 - One responsive page header

The user approved replacing the redundant global title bar with one shared PageHeader component per authenticated screen. It owns the page title, optional description and existing page actions at every width; the mobile sidebar trigger sits in the same row and is hidden on desktop. Headers scroll with content rather than reserving an extra fixed row. Keep the menu accessible in loading, error and onboarding states, retain one h1 per screen, and preserve focus restoration when the mobile menu closes. The desktop sidebar and mobile bottom pill remain the navigation surfaces. This supersedes D-037's separate fixed page header; money, authorization and drawer behavior are unchanged.

### D-039 - 2026-11-09 - Compact persistent page headers

The user requested a persistent page header for reliable mobile sidebar access and approved refining the shared layout with a mobile plus action on Expenses. Keep PageLayout headers outside the content scroll region at every width; this supersedes D-038's scrolling-header behavior. Use the same compact, accessible Add expense header action on Home, Expenses, group and friend details, with its full label on desktop. Preserve the existing palette, typography family, sidebar and bottom navigation. No financial behavior changes.

### D-040 - 2026-11-09 - One monthly expense history

The user approved one expense history instead of My spending and All tabs. Default to the latest month containing matching expenses, with a month selector and All months for a descending continuous history. Each month header pairs November ’26 style text with the viewer's spending total; rows emphasize the viewer's owed share and show the full shared bill as secondary text. Monthly totals cover all matching pages, exclude settlements and deleted expenses, and remain separate per currency. Both, Personal and Shared are immediate quick filters. Advanced filters use a bottom sheet on mobile and a right sheet on desktop for custom dates and including visible group expenses with no viewer share. Such rows say No share and do not increase spending. Deleted expenses move to the overflow menu and retain Restore. Filters live in the URL and list scroll is ephemeral session UI state. Remove the large summary card and introductory explanation row, per the user's follow-up. This supersedes the month-to-date default and tab prescription in design section 6.14. Keep the selected Nova theme, Oxanium font, semantic tokens, mobile targets and persistent shell. Craft guidance: [unslop by Damir Sokolovsky](https://heydamir.design/unslop), CC BY 4.0.

### D-041 - 2026-11-10 - Consistent icon-only back navigation

The user requested icons on every back control, preferring icon-only controls, and an app-wide behavior audit informed by web conventions. Use one accessible ArrowLeft control with a 44px target. Detail pages return to explicit parents, with the exact source URL carried from expense history to preserve filters. Direct detail links have a usable parent destination. Auth return links stay explicit and preserve existing callback context; form-step arrows stay inside the drawer and keep its focus restoration. The user explicitly chose Back plus title on detail screens with the mobile menu hidden there; main screens retain Menu, and the desktop sidebar retains its toggle. This supersedes the every-screen mobile menu requirement in D-039. Menu items retain text and an icon. References: https://m1.material.io/patterns/navigation.html and https://www.nngroup.com/articles/user-control-and-freedom/. No financial or authorization policy changes.

### D-042 - 2026-11-09 - Upstash for shared rate limiting

The user selected Upstash and requested a first-rollout architecture. Move short-lived auth and people-operation rate-limit counters to managed Upstash Redis within the free-tier constraint. The user explicitly chose temporary errors when Upstash is unavailable or its quota is exhausted: protected actions must not proceed without a confirmed limit decision. Do not automatically fall back to another counter store. Keep sessions, credentials, permissions, financial records, idempotency and the transactional balance cache in Postgres. Additional caching is deferred. Recipient email cooldown thresholds remain a proposal pending confirmation. See [the rollout architecture](upstash-rollout.md) for integration boundaries, failure behavior, capacity planning and release gates; this decision does not mean implementation or provisioning is complete.

### D-043 - 2026-11-10 - Implement Upstash rollout and recipient cooldowns

The user instructed us to proceed with the documented rollout, including one account email per recipient and purpose per minute and five per hour across verification and password reset. Use generic recipient-level suppression and fail closed with temporary errors when protection is unavailable. Inspection of Better Auth 1.7.18 showed custom-storage errors escape its HTTP error handler; use its supported effective-rule callback and request plugin together to return native 429/503 responses. Preflight reset, resend and signup before identity lookup or writes, carry allowance in request-scoped state, and send SMTP through the after-transaction hook. Postgres remains authoritative for sessions and financial state. Production provisioning and Vercel/provider smoke checks remain deployment work.

### D-044 - 2026-11-12 - Use Vercel's generated KV environment variables

The user requested using the Redis variables automatically created by the Vercel Upstash integration. Read KV_REST_API_URL and the read/write KV_REST_API_TOKEN directly in local development and Vercel. This replaces the duplicate UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN aliases in the rollout instructions. RATE_LIMIT_KEY_SECRET and RATE_LIMIT_NAMESPACE remain app-owned configuration. No rate-limit policy or HTTP contract changes.
