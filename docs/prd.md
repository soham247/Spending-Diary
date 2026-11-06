# Spending Diary — Product Requirements

Status: Draft v1 · Owner: Founder · Last updated: 2026-09-30

## 1. Summary

Spending Diary helps people share costs without awkwardness. Friends, flatmates,
couples, and trip groups log shared expenses, see exactly who owes whom, and
settle up in one tap over UPI. Every user also gets a personal spending diary:
their share of shared expenses plus their solo spending, organized by category
and month.

The product competes with Splitwise on three points: it is free, it is built for
India first (UPI settle-up, INR formatting, WhatsApp-native invites), and it
treats personal spending as a first-class feature instead of an afterthought.

## 2. Problems we solve

1. **Keeping score is tedious.** After a trip or a month in a shared flat, nobody
   knows the real numbers. Mental math and WhatsApp threads cause arguments.
2. **Asking for money is awkward.** People avoid chasing small amounts, so debts
   linger and friendships strain.
3. **Settling is a separate chore.** Even once the number is known, you still
   switch apps, type UPI IDs, and type amounts.
4. **Shared costs distort personal budgets.** If you paid ₹3,000 for dinner but
   your share was ₹750, most trackers record the wrong number.

## 3. Target users

| Persona | Situation | What they need most |
|---|---|---|
| **Flatmates** (primary) | 2–5 people sharing rent, groceries, utilities, Wi-Fi | Recurring bills, running balances, monthly settle-up |
| **Trip groups** | 3–10 friends on a weekend or week-long trip | Fast entry on phones, multiple payers, a clean "who pays whom" at the end |
| **Couples** | Two people with mixed shared and personal spending | Low friction, uneven splits, one running balance |
| **College friends** | Frequent small expenses (food, cabs, tickets) | Speed, zero cost, invites that work over WhatsApp |

Primary device: Android phone on mobile data. The app must be fast and usable
on a mid-range phone over a slow connection.

## 4. Goals and non-goals

### Goals

- A new user can go from an invite link to seeing what they owe in under 20
  seconds.
- Adding a typical equal-split expense takes under 10 seconds.
- Balances are always correct to the paisa and explainable line by line.
- Settle-up over UPI takes one tap from the balance screen.
- Phase 1 runs entirely on free tiers.

### Non-goals (for now)

- Moving money. We never hold or transfer funds; UPI settle-up opens the user's
  own UPI app. We only record that a payment happened.
- Bank account linking or automatic transaction import.
- Business or multi-tenant accounting.
- Native iOS/Android apps. Phase 1 is a responsive web app, installable as a PWA.
- Currency conversion. Phase 1 supports one currency per group.

## 5. Phases

| Phase | Theme | Scope |
|---|---|---|
| **1 — MVP** | Split and settle, correctly | Auth, onboarding, friends, groups, invites, expenses (equal / exact / percentage / shares), multi-payer, edit / delete / restore, balances, debt simplification, settle-up (UPI + cash), activity feed, web push, personal expenses, monthly insights |
| **2 — Habit** | Make it stick | Recurring expenses, comments, receipts, budgets with alerts, reminders to settle, CSV export, per-user custom categories |
| **3 — Delight** | Differentiate | Natural-language expense entry, receipt scanning with itemized split, multi-currency trips, trip summary, premium tier |

Everything below is Phase 1 unless marked otherwise.

## 6. Functional requirements

### 6.1 Authentication

Users sign in with **Continue with Google** or an **email magic link**. There
are no passwords.

- **AUTH-1** The login screen shows Google as the primary action and "Use email
  instead" as a secondary option.
- **AUTH-2** Requesting a magic link always shows the same "Check your inbox"
  message, whether or not the email has an account.
- **AUTH-3** The emailed link opens a confirm page with a single "Continue"
  button. Only pressing the button signs the user in, so email link scanners
  can't consume the token.
- **AUTH-4** Magic links expire after 15 minutes and work once.
- **AUTH-5** Magic-link requests are limited to 3 per email per 10 minutes and
  are also limited per IP.
- **AUTH-6** Sessions last 90 days and slide forward with use. Settings lists
  signed-in devices, each with a "Sign out" action.
- **AUTH-7** A Google account and a magic-link sign-in with the same verified
  email resolve to the same user.
- **AUTH-8** If an invite token is present when login starts, the user lands
  back on that invite after signing in, including when they open the email on
  another device.

Acceptance: a user who opens a magic link in Outlook (which pre-scans links) can
still sign in. A user who signs up with Google and later uses a magic link with
the same email sees the same account.

### 6.2 Onboarding

- **ONB-1** First sign-in asks only for a display name (prefilled from Google).
- **ONB-2** A UPI ID is optional and can be added later. Users who add one can
  receive one-tap settle-ups.
- **ONB-3** If the user arrived through an invite, onboarding ends inside that
  group or friend view, not on the home screen.
- **ONB-4** After onboarding, the app asks once for push notification
  permission, with a plain explanation of what will be sent.

### 6.3 Friends

- **FR-1** Users can add a friend by sharing their personal invite link or QR
  code, or by adding someone by name (creating a placeholder, see 6.5).
- **FR-2** Friendships are mutual and stored once per pair.
- **FR-3** Users can have direct (non-group) expenses with any friend.
- **FR-4** Users can block a friend. A blocked user can't add them to new
  expenses or groups. Existing balances remain visible.
- **FR-5** A friend's page shows the net balance per currency, all shared
  expenses (direct and in groups), and a "Settle up" action.

### 6.4 Groups

- **GRP-1** A user can create a group with a name, a type (Trip, Home, Couple,
  Other), and a currency (default INR).
- **GRP-2** The creator is an admin. Admins can rename the group, change the
  debt simplification setting, manage invite links, remove members, and
  archive the group.
- **GRP-3** Members can add expenses, record settlements, and leave the group.
- **GRP-4** A member with a non-zero balance in the group can't leave it and is
  told to settle first. Admins removing such a member see a warning; the
  member's history and balances remain.
- **GRP-5** Archived groups are read-only and hidden from the main list, but
  still visible under "Archived groups". Balances still count toward totals.
- **GRP-6** Groups are never hard-deleted.
- **GRP-7** "Simplify debts" (on by default) shows the smallest set of payments
  that settles everyone. Turning it off shows raw pairwise balances.

### 6.5 Invites and placeholders

- **INV-1 Group link.** Admins can create a shareable group link. Links expire
  after 14 days by default, can be revoked, and can be rotated. Anyone with the
  link can join after signing in.
- **INV-2 Direct invite.** When a user adds someone who isn't on the app, the
  app creates a placeholder person and records expenses against them
  immediately. It then produces a single-use link for that person.
- **INV-3 Personal link and QR.** Every user has a permanent link and QR code
  that adds them as a friend.
- **INV-4** Invites are sent through the inviter's own apps: the share button
  opens the device share sheet (WhatsApp first in the list on most Android
  phones). The app itself never sends invite messages.
- **INV-5** The invite landing page previews what the person is joining before
  sign-in:
  - Direct invite: the inviter, the name they were added as, and their current
    balance.
  - Group link: group name, inviter, and member count. Never balances.
- **INV-6** Claiming a direct invite merges the placeholder's history into the
  signed-in account, including when the claimer already had an account.
- **INV-7** After a direct invite is claimed, the inviter is notified with the
  claimer's name and email, and can report a wrong claim.
- **INV-8** Placeholders can't log in and never receive email.

Acceptance: Priya adds "Rahul" to three expenses before Rahul has an account.
Rahul opens the link, sees "You owe Priya ₹1,450", signs in with Google, and
lands in the group with all three expenses and the correct balance.

### 6.6 Expenses

**Creating**

- **EXP-1** Required: amount, description, date (defaults to today), who paid,
  and who it's split with. Optional: category, notes.
- **EXP-2** The default is "Paid by you, split equally with everyone selected".
  In a group, everyone in the group is selected by default.
- **EXP-3** Split types:
  - **Equal** — among selected people.
  - **Exact** — each person's amount is entered.
  - **Percentage** — each person's percentage is entered and must total 100%.
  - **Shares** — ratios like 2:1:1 (a couple counting as two).
- **EXP-4** Multiple payers are supported ("Priya paid ₹600, Aman paid ₹400").
- **EXP-5** While editing a split, the form shows the remaining amount live
  ("₹20 left to assign") and blocks saving until it is zero.
- **EXP-6** Rounding is automatic and deterministic: ₹100 split three ways is
  ₹33.33, ₹33.33, and ₹33.34. Users never see a total that doesn't add up.
- **EXP-7** Amounts are entered in rupees with up to two decimals, and stored as
  whole paise.
- **EXP-8** Double-tapping Save never creates two expenses.
- **EXP-9** In a group, only current members can be participants. Outside a
  group, only friends (including placeholders) can be participants.

**Personal expenses**

- **EXP-10** A user can log an expense only for themselves. It never affects
  balances and counts fully toward their spending.

**Editing, deleting, restoring**

- **EXP-11** Any participant of an expense, and any group admin, can edit or
  delete it.
- **EXP-12** If someone else changed the expense after the editor opened it,
  saving shows "This expense was changed by Aman. Review the latest version."
  and nothing is overwritten.
- **EXP-13** Deleting shows a toast with Undo. Deleted expenses are listed
  under "Deleted expenses" in the group and can be restored.
- **EXP-14** Every change is recorded in the activity feed with who did it and
  what changed (for example "Aman changed the amount from ₹900 to ₹1,200").

### 6.7 Balances

- **BAL-1** Home shows the user's overall position per currency ("Overall,
  you're owed ₹2,340") and a list of people and groups with non-zero balances.
- **BAL-2** Each balance is explainable: tapping it lists the expenses and
  settlements that make it up.
- **BAL-3** Balances update immediately after any change, on every member's
  device the next time the data refreshes.
- **BAL-4** Balances are never shown as a converted total across currencies.
- **BAL-5** A balance within ±₹0.99 of zero is still shown exactly; the app
  doesn't round debts away.

### 6.8 Settle up

- **SET-1** From any balance, "Settle up" opens a sheet prefilled with the
  amount owed and the other person.
- **SET-2** If the recipient has a UPI ID, "Pay with UPI" opens the user's UPI
  app with payee, amount, and note filled in.
- **SET-3** After returning, the app asks "Did the payment go through?". Yes
  records the settlement with method UPI; No does nothing.
- **SET-4** "Record a cash payment" records a settlement without UPI.
- **SET-5** Partial settlements are allowed. Overpayment is allowed with a
  warning ("This is ₹200 more than you owe").
- **SET-6** Either side of a settlement can delete it, with Undo, and it is
  restorable.
- **SET-7** Settlements never count as spending.

### 6.9 Activity and notifications

- **ACT-1** A global activity feed shows everything involving the user, newest
  first. Each group has its own feed.
- **ACT-2** Activity entries are written in plain language and link to the item.
- **NOT-1** Web push notifications are sent when someone adds, edits, or
  deletes an expense involving the user, records a settlement with them, or
  claims an invite they sent.
- **NOT-2** Users can turn each notification type off in Settings.
- **NOT-3** Users never get notified about their own actions.

### 6.10 Personal spending and insights

- **INS-1** The Insights screen shows the user's spending for a month: total,
  a breakdown by category, and the change against the previous month.
- **INS-2** Spending is the user's owed share of shared expenses plus their
  personal expenses. What they paid on behalf of others is not their spending.
- **INS-3** Users can filter to shared only, personal only, or both.
- **INS-4** Categories are a fixed default set in Phase 1: Food, Groceries,
  Transport, Rent, Utilities, Shopping, Entertainment, Travel, Health, Other.
  Custom categories are Phase 2.

### 6.11 Settings

- **SETT-1** Profile: name, photo (from Google), phone (optional, unverified),
  UPI ID.
- **SETT-2** Notifications: per-type switches.
- **SETT-3** Devices: list of sessions with sign-out.
- **SETT-4** Appearance: light, dark, or system.
- **SETT-5** Delete account: anonymizes the user. Their name becomes "Former
  member" in other people's history; expenses and balances are preserved.

## 7. Phase 2 and 3 requirements (summary)

- **Recurring expenses (P2):** templates with schedules (monthly rent, weekly
  groceries), created by a scheduled job with idempotency.
- **Comments (P2):** per-expense threads with notifications.
- **Receipts (P2):** one image per expense, stored in free-tier object storage.
- **Budgets (P2):** monthly per-category and overall limits, with alerts at 80%
  and 100%.
- **Reminders (P2):** "Remind Aman" sends a push, at most once per 3 days per
  pair.
- **Export (P2):** CSV per group or date range.
- **Natural-language entry (P3):** "Dinner 2400 with Rahul and Priya, I paid"
  becomes a prefilled form the user confirms.
- **Receipt scanning (P3):** line items extracted, members tap what they had,
  tax and tip distributed proportionally.
- **Multi-currency (P3):** per-expense currency with an exchange rate snapshot.
- **Premium (P3):** candidates are receipt scanning, natural-language entry,
  multi-currency, advanced insights, and export.

## 8. Non-functional requirements

### Correctness

- Every expense balances to the paisa, enforced in both application code and
  the database.
- Balance totals can be rebuilt from the ledger at any time. A nightly job
  compares the cache to the ledger and alerts on any difference.
- Money is never stored or computed as floating point.

### Performance

- Home and group screens reach usable content in under 1.5 s on a mid-range
  Android phone over 4G.
- Balance reads are single indexed lookups, not aggregations over history.
- Lists use cursor pagination with 30 items per page.

### Reliability

- All money writes are atomic. A failure leaves no partial state.
- Create endpoints are idempotent.

### Security and privacy

- Every read and write checks that the viewer belongs to the group or is a
  participant.
- A "not found" and a "not allowed" look the same to the client.
- Invite tokens are 128-bit random values, stored hashed, with expiry.
- Placeholder data is limited to the name the inviter entered and an optional
  phone number, in line with India's DPDP Act. A person can delete their
  placeholder or block the inviter after claiming it.

### Accessibility

- WCAG 2.2 AA contrast. Meaning never depends on color alone.
- All actions are reachable by keyboard with visible focus.
- Touch targets are at least 44 px.

### Cost

- Phase 1 runs on free tiers: Postgres, hosting, email (own SMTP), push, and
  rate limiting. Paid services require a decision log entry.
- Vercel Hobby is for non-commercial use. Before the premium tier charges
  money, move hosting to a plan that allows commercial use.

## 9. Success metrics

| Metric | Target (first 3 months) |
|---|---|
| Invite link → signed-in conversion | ≥ 50% |
| Time from invite open to seeing balance | median < 20 s |
| Median time to add an equal-split expense | < 10 s |
| Week-4 retention of users in an active group | ≥ 40% |
| Settlements recorded via UPI | ≥ 30% of all settlements |
| Balance reconciliation mismatches | 0 |

## 10. Open questions

- Should non-participant group members be allowed to edit expenses, or only
  participants and admins? (Current answer: participants and admins.)
- Should we show a group's simplified plan to all members or only to those
  involved in each payment? (Current answer: all members.)
- What is the retention period for deleted expenses before they disappear from
  "Deleted expenses"? (Current answer: they never disappear.)

Record answers in `docs/decisions.md`.