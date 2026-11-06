# Spending Diary — Design

The visual language, tokens, screens, and UI patterns. Built on shadcn/ui and
Tailwind. Read the "Styling & design tokens" section of `AGENTS.md` alongside
this doc; the rules there (no arbitrary colors, no opacity-modified tokens) are
enforced in review.

## 1. What the design is for

**Subject:** money between friends. Small, frequent, slightly awkward amounts.

**Audience:** people in their 20s and 30s in India, mostly on Android phones,
often entering an expense while standing at a counter or sitting in a cab.

**Primary job:** answer "where do I stand, and with whom?" in one glance, then
make the next action (add, settle) obvious.

The product should feel like a well-kept notebook: calm, exact, and a little
warm. Not a bank app (cold, dense, alarming), not a fintech app (gradients,
confetti, cards everywhere).

## 2. Principles

1. **The balance speaks in sentences.** The most important information is
   written as plain language with the number inline: "Overall, you're owed
   ₹2,340". Not a stat tile with a tiny label. This sentence is the one bold
   element in the product; everything around it stays quiet.
2. **Color carries meaning, only for money.** Teal means someone owes you,
   amber means you owe. Everything else is ink on paper. If a color isn't
   telling you about money direction or an action's consequence, it shouldn't
   be there.
3. **Rows, not cards.** Lists of people, groups, and expenses are rows
   separated by dividers inside one surface. Cards are for things that stand
   alone (a settle-up plan, an invite preview).
4. **One primary action per screen.** Home: add expense. A balance: settle up.
   A form: save. Everything else is secondary or tertiary.
5. **Numbers never jump.** All amounts use tabular figures and align right, so
   columns of numbers line up and live-updating totals don't shift.
6. **Words over icons.** Icons support labels; they don't replace them, except
   for universally understood actions in the navigation bar.

## 3. Visual language

### 3.1 Color

The base is a cool, slightly green-grey paper with near-black ink. The two
money colors are chosen to be distinct from each other for color-blind users
(teal vs amber differ strongly in lightness and hue) and to avoid red for "you
owe": owing a friend isn't an error.

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | `#F6F7F6` | `#111615` | App background (paper) |
| `foreground` | `#18201E` | `#E8ECEA` | Primary text (ink) |
| `card` / `popover` | `#FFFFFF` | `#182020` | Surfaces that hold rows, sheets, menus |
| `muted` | `#ECEFED` | `#202A28` | Subtle fills: selected rows, input backgrounds, skeletons |
| `muted-foreground` | `#5F6B67` | `#98A5A1` | Secondary text, meta lines, settled amounts |
| `border` / `input` | `#DDE2DF` | `#2A3532` | Dividers, input outlines |
| `primary` | `#18201E` | `#E8ECEA` | Primary buttons (ink), active nav |
| `primary-foreground` | `#F6F7F6` | `#111615` | Text on primary |
| `ring` | `#5F6B67` | `#98A5A1` | Focus ring |
| `credit` | `#0F766E` | `#3CC2AE` | "Owes you", "you're owed" amounts |
| `credit-muted` | `#DDF1EE` | `#12302D` | Background for credit chips and the settle banner |
| `debit` | `#B45309` | `#F0A05A` | "You owe" amounts |
| `debit-muted` | `#FBEBD9` | `#35240F` | Background for debit chips |
| `destructive` | `#B42318` | `#F0786A` | Delete, remove member. Never for "you owe". |
| `chart-1` … `chart-5` | `#3B6FB6` `#7A5AA6` `#2F8F6B` `#C08A1E` `#A84D6F` | lighter equivalents | Category colors in Insights only |

Primary buttons are ink, not colored. This keeps teal and amber exclusively
meaningful. A green "Save" button next to a green "owes you" number would
teach users that green means nothing.

#### Adding the tokens

shadcn with Tailwind v4 defines variables in `globals.css` and maps them in
`@theme inline`. Add the money tokens next to the defaults:

```css
:root {
  --background: #F6F7F6;
  --foreground: #18201E;
  --card: #FFFFFF;
  --card-foreground: #18201E;
  --popover: #FFFFFF;
  --popover-foreground: #18201E;
  --primary: #18201E;
  --primary-foreground: #F6F7F6;
  --secondary: #ECEFED;
  --secondary-foreground: #18201E;
  --muted: #ECEFED;
  --muted-foreground: #5F6B67;
  --accent: #ECEFED;
  --accent-foreground: #18201E;
  --destructive: #B42318;
  --border: #DDE2DF;
  --input: #DDE2DF;
  --ring: #5F6B67;
  --credit: #0F766E;
  --credit-foreground: #FFFFFF;
  --credit-muted: #DDF1EE;
  --debit: #B45309;
  --debit-foreground: #FFFFFF;
  --debit-muted: #FBEBD9;
  --chart-1: #3B6FB6;
  --chart-2: #7A5AA6;
  --chart-3: #2F8F6B;
  --chart-4: #C08A1E;
  --chart-5: #A84D6F;
  --radius: 0.625rem;
}

.dark {
  --background: #111615;
  --foreground: #E8ECEA;
  --card: #182020;
  --card-foreground: #E8ECEA;
  --popover: #182020;
  --popover-foreground: #E8ECEA;
  --primary: #E8ECEA;
  --primary-foreground: #111615;
  --secondary: #202A28;
  --secondary-foreground: #E8ECEA;
  --muted: #202A28;
  --muted-foreground: #98A5A1;
  --accent: #202A28;
  --accent-foreground: #E8ECEA;
  --destructive: #F0786A;
  --border: #2A3532;
  --input: #2A3532;
  --ring: #98A5A1;
  --credit: #3CC2AE;
  --credit-foreground: #111615;
  --credit-muted: #12302D;
  --debit: #F0A05A;
  --debit-foreground: #111615;
  --debit-muted: #35240F;
  --chart-1: #7FA6DE;
  --chart-2: #B39AD6;
  --chart-3: #6CC4A0;
  --chart-4: #E3B85A;
  --chart-5: #D98AA8;
}

@theme inline {
  --color-credit: var(--credit);
  --color-credit-foreground: var(--credit-foreground);
  --color-credit-muted: var(--credit-muted);
  --color-debit: var(--debit);
  --color-debit-foreground: var(--debit-foreground);
  --color-debit-muted: var(--debit-muted);
}
```

(The default shadcn mappings for `background`, `card`, etc. already exist in
`@theme inline`; only the money tokens are new.)

Contrast: `credit` and `debit` on `card` and `background` meet 4.5:1 for body
text in both themes. Check any new token with a contrast tool before merging.

### 3.2 Typography

**Typeface: IBM Plex Sans**, one family for everything, loaded with
`next/font/google`. Chosen because it has a clear rupee sign, true tabular
figures, a slightly technical, ledger-like character that suits exact numbers,
and a matching **IBM Plex Sans Devanagari** for a future Hindi interface.
Fallback: `system-ui, sans-serif`.

Before shipping, verify in the browser that the ₹ glyph renders in Plex (not
from a fallback font) and that `font-variant-numeric: tabular-nums` changes
digit widths.

| Role | Classes | Where |
|---|---|---|
| Balance sentence | `text-2xl font-normal leading-snug`, amount inside it `text-4xl font-semibold tracking-tight` | Home, group, friend headers |
| Screen title | `text-xl font-semibold` | Top of each screen |
| Section heading | `text-sm font-medium text-muted-foreground` | Above lists ("Groups", "This month") |
| Row title | `text-base font-medium` | Person, group, expense names |
| Body | `text-sm` | Most text |
| Meta | `text-sm text-muted-foreground` | "Priya paid ₹1,200" under a row title |
| Row amount | `text-base font-medium tabular-nums` | Right side of rows |
| Small print | `text-xs text-muted-foreground` | Timestamps, helper text |

Rules:

- Sentence case everywhere. No all-caps labels, no letter-spaced eyebrows
  above headings.
- Meta lines are sentences or comma-separated phrases ("Priya paid ₹1,200,
  split 4 ways"), not strings joined with middle dots.
- Line length stays under about 70 characters; the content column is at most
  `max-w-2xl`.

### 3.3 Spacing, radius, elevation

- **Spacing:** Tailwind scale only. Screen padding `px-4` on mobile, `px-6` on
  desktop. Rows `py-3`. Sections separated by `space-y-6`.
- **Radius hierarchy** (not one radius for everything):
  - Sheets, dialogs, and the list surface: `rounded-xl`
  - Buttons, inputs, chips: `rounded-md`
  - Avatars: `rounded-full`
  - Rows inside a surface: no radius; they're separated by `divide-y`
- **Elevation:** flat by default. Shadows only on things that float above the
  page (dropdowns, sheets, dialogs, the mobile add button). Surfaces are
  distinguished by `bg-card` on `bg-background` plus `border`, not shadows.

### 3.4 Icons

`lucide-react`, `size-5` in rows and navigation, `size-4` inside buttons,
`strokeWidth={1.75}`. Categories each have one icon (Food → `Utensils`,
Groceries → `ShoppingBasket`, Transport → `Car`, Rent → `House`,
Utilities → `Zap`, Shopping → `ShoppingBag`, Entertainment → `Clapperboard`,
Travel → `Plane`, Health → `HeartPulse`, Other → `Receipt`), shown in a
`size-10 rounded-md bg-muted` square.

### 3.5 Motion

Motion only answers what the person did:

- Sheets and drawers slide in (shadcn defaults).
- A new or restored row fades in once, 150 ms.
- A deleted row collapses, 150 ms, and the Undo toast appears.
- Balances don't animate or count up. They change instantly; a number that
  ticks upward invites the question "which one is right?".

Respect `prefers-reduced-motion`: disable the row fade and collapse.

## 4. Money display

Every amount renders through one component: `<Money />`
(`components/money/Money.tsx`).

```tsx
type MoneyProps = {
  minor: number;                    // integer minor units
  currency: string;                 // "INR"
  tone?: "auto" | "neutral";        // auto: credit if > 0, debit if < 0
  sign?: "never" | "always";        // default "never": direction comes from words
  size?: "row" | "hero" | "inline";
};
```

Rules:

- Formatting uses `Intl.NumberFormat("en-IN", { style: "currency", currency })`,
  which gives Indian digit grouping (₹1,25,000.00). Paise are shown only when
  non-zero: ₹1,200 and ₹1,200.50.
- Always `tabular-nums`.
- Direction is said in words next to the number, never by a minus sign alone:
  "owes you ₹450", "you owe ₹450", "settled up".
- Zero balances render as "settled up" in `text-muted-foreground`, not as ₹0.
- `tone="auto"` colors `credit`/`debit`; `neutral` is for expense totals,
  which aren't a direction.

| State | Row right side | Color |
|---|---|---|
| They owe you | `owes you` / `₹450` (two lines, right-aligned) | `credit` |
| You owe them | `you owe` / `₹450` | `debit` |
| Settled | `settled up` | `muted-foreground` |
| Expense you're not in | `not involved` | `muted-foreground` |

## 5. Layout and navigation

### Mobile (default, < 768 px)

```
┌──────────────────────────────┐
│ Title                  ⋯     │  top bar: screen title, overflow menu
│                              │
│  content, px-4               │
│                              │
│                              │
│                        ( + ) │  add-expense button, bottom-right,
├──────────────────────────────┤  above the nav
│  Home  Groups  Activity  You │  bottom navigation, labels always shown
└──────────────────────────────┘
```

- Four destinations: **Home, Groups, Activity, You** (You = Insights plus
  Settings). Each is an icon with a label.
- The add button is a round `size-14` ink button with a `Plus` icon and
  `aria-label="Add expense"`, bottom-right above the nav. It's the only
  floating element and the only one with a shadow on the page.
- Inside a group or friend screen, the add button prefills that group or
  friend.
- Bottom nav uses `pb-[env(safe-area-inset-bottom)]`, which is the one
  sanctioned arbitrary value; add it as a utility in `globals.css` so call
  sites use a named class.

### Desktop (≥ 768 px)

```
┌───────────┬────────────────────────────────────────┐
│ Spending  │  Title                    [Add expense]│
│ Diary     │                                        │
│           │   content, max-w-2xl, left-aligned     │
│ Home      │                                        │
│ Groups    │                                        │
│ Activity  │                                        │
│ Insights  │                                        │
│           │                                        │
│ ───────── │                                        │
│ Goa Trip  │                                        │
│ Flat 302  │                                        │
│ + New     │                                        │
│           │                                        │
│ Settings  │                                        │
└───────────┴────────────────────────────────────────┘
```

- shadcn `Sidebar` with the four destinations, then the user's groups, then
  Settings at the bottom.
- "Add expense" becomes a regular primary button in the page header.
- Content is left-aligned in a `max-w-2xl` column. Numbers align right within
  that column.

### Sheets vs dialogs

Forms open as a bottom `Drawer` on mobile and a `Dialog` on desktop, through
one `ResponsiveDialog` wrapper that switches on a `useIsDesktop()` hook.
Full-screen pages are used only for flows with several steps (onboarding,
invite landing).

## 6. Screens

Each screen lists its purpose, layout, and states. Copy in quotes is the actual
copy to use.

### 6.1 Login

```
┌──────────────────────────────┐
│                              │
│  Spending Diary              │
│  Split costs with friends,   │
│  keep track of your own.     │
│                              │
│  [ G  Continue with Google ] │  primary (ink)
│                              │
│  Use email instead           │  text button, reveals email field
│                              │
└──────────────────────────────┘
```

- Email state: one `Input type="email" autoComplete="email"` and a
  "Send sign-in link" button.
- Sent state: "Check your inbox. We sent a sign-in link to
  rahul@gmail.com. It works for 15 minutes." plus "Use a different email".
- Error (rate limited): "Too many requests for this email. Try again in 10
  minutes, or continue with Google."
- If arriving from an invite, a single line above the buttons: "Priya invited
  you to Goa Trip."

### 6.2 Confirm sign-in (`/auth/confirm`)

One heading ("Sign in to Spending Diary"), one full-width "Continue" button.
Expired or used link: "This link has expired or was already used." with a
"Send a new link" button. No automatic sign-in on page load (see PRD AUTH-3).

### 6.3 Onboarding

Single step: "What should friends call you?" with the name prefilled from
Google, and an optional "UPI ID (for receiving money)" field with helper text
"You can add this later." Button: "Get started".

### 6.4 Home

```
┌──────────────────────────────┐
│ Home                         │
│                              │
│ Overall, you're owed         │  balance sentence
│ ₹2,340                       │  amount: text-4xl, credit
│ You owe ₹600, you're owed    │  meta line
│ ₹2,940.                      │
│                              │
│ People                       │  section heading
│ ┌──────────────────────────┐ │
│ │ (A) Aman        owes you │ │
│ │     Flat 302     ₹1,850  │ │
│ │──────────────────────────│ │
│ │ (P) Priya        you owe │ │
│ │     Goa Trip       ₹600  │ │
│ │──────────────────────────│ │
│ │ (R) Rahul       owes you │ │
│ │     2 groups     ₹1,090  │ │
│ └──────────────────────────┘ │
│ Show settled friends         │  text button
│                              │
│ Groups                       │
│ ┌──────────────────────────┐ │
│ │ [✈] Goa Trip   you owe   │ │
│ │     6 people     ₹600    │ │
│ │──────────────────────────│ │
│ │ [⌂] Flat 302  owes you   │ │
│ │     3 people   ₹1,850    │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

- Balance sentence variants: "Overall, you're owed ₹2,340" (credit),
  "Overall, you owe ₹600" (debit), "You're all settled up" (no amount,
  foreground). Multiple currencies: one sentence per currency.
- People are sorted by absolute balance, largest first. Settled friends are
  hidden behind "Show settled friends".
- Empty state (new user): "Add your first expense or create a group to start
  splitting." with two buttons: "Create a group" (primary) and "Add an
  expense" (outline).
- Loading: skeleton rows matching the real row layout (avatar circle, two text
  lines, right-aligned amount), never a spinner.

### 6.5 Group

```
┌──────────────────────────────┐
│ ←  Goa Trip              ⋯   │
│                              │
│ You owe ₹600 in this group   │  balance sentence (smaller: text-3xl)
│                              │
│ [ Settle up ]  [ Invite ]    │  primary + outline
│                              │
│ Expenses  Balances  Activity │  Tabs
│ ─────────                    │
│ September 2026               │  month heading
│ ┌──────────────────────────┐ │
│ │ Sep  [🍴] Dinner at     │ │
│ │ 28        Thalassa  you  │ │
│ │     Priya paid    owe    │ │
│ │     ₹4,800       ₹800    │ │
│ │──────────────────────────│ │
│ │ Sep  [🚗] Cab to  you lent│ │
│ │ 27        airport ₹1,000 │ │
│ │     You paid ₹1,500      │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

- **Expenses tab:** rows grouped by month. Row anatomy: date (month + day,
  stacked, `text-xs`), category icon, description, meta line "Priya paid
  ₹4,800", and on the right the viewer's position: "you owe ₹800", "you lent
  ₹1,000", or "not involved". Tap opens expense detail. Infinite scroll with
  cursor pagination; "Deleted expenses" link at the bottom.
- **Balances tab:** with simplify on, a card titled "Suggested payments"
  listing "Priya pays Aman ₹1,200" rows, each with "Settle" if the viewer is
  one of the two. Below it, each member's net in the group. A small line
  explains the setting: "Debts are simplified to the fewest payments. Change
  in group settings."
- **Activity tab:** activity rows (see 6.10).
- **Overflow menu:** Group settings, Invite link, Deleted expenses, Archive
  group (admin only).
- Empty group: "No expenses yet. Add the first one, or invite people to
  join." with "Add expense" and "Invite people".

### 6.6 Friend

Same structure as the group screen: balance sentence ("Aman owes you
₹1,850"), "Settle up" and "Remind" (Phase 2), then a list of every shared
expense and settlement with that person across groups and direct, each row
showing which group it came from in the meta line.

### 6.7 Add or edit expense

The most-used screen. Optimized for the default case: paid by you, split
equally.

```
┌──────────────────────────────┐
│ Add expense            Cancel│
│                              │
│ ₹ 1,200                      │  amount: large input, autofocus,
│                              │  inputMode="decimal"
│ What was it for?             │
│ [ Dinner at Thalassa      ]  │
│                              │
│ [🍴 Food ▾]  [📅 Today ▾]    │  category + date as compact pickers
│                              │
│ In  [ Goa Trip ▾ ]           │  group or "No group"
│                              │
│ Paid by  [ You ▾ ]           │
│ Split    [ Equally ▾ ]       │
│          among 4 people      │  tap to change people
│                              │
│ ₹300 each                    │  live preview, muted
│                              │
│ [          Save           ]  │  primary, full width
└──────────────────────────────┘
```

- **Amount first.** The amount field is autofocused, `text-4xl tabular-nums`,
  with `inputMode="decimal"` for the numeric keyboard. It accepts "1200",
  "1,200", and "1200.5"; parsing goes through `toMinor()`.
- **Description** suggests the category from keywords (e.g. "uber" → Transport)
  but never overrides a category the user picked.
- **Paid by** opens a sheet: "You" by default, pick one person, or "Multiple
  people" to enter amounts per payer.
- **Split** opens the split editor (6.8).
- **Preview line** always shows the result in words: "₹300 each", "You owe
  Priya ₹800", "Aman owes you ₹400, Rahul owes you ₹400".
- **Save** is disabled until the amount is valid and the split balances. The
  reason is shown next to it ("₹20 left to assign"), not only as a disabled
  state.
- **Personal expense:** choosing "No group" and removing everyone else from
  the split turns the preview into "Just for you" and saves a personal
  expense.
- **Edit conflict:** an `Alert` at the top: "Aman changed this expense while
  you were editing." with "Load latest" and "Keep editing". Saving is blocked
  until the user loads the latest version.

### 6.8 Split editor

A sheet with a `ToggleGroup` for the split type: **Equally, Exact amounts,
Percentages, Shares**. Below it, one row per person.

```
┌──────────────────────────────┐
│ Split ₹1,200                 │
│ [Equally][Exact][%][Shares]  │
│                              │
│ ☑ (Y) You           ₹300.00  │
│ ☑ (A) Aman          ₹300.00  │
│ ☑ (P) Priya         ₹300.00  │
│ ☑ (R) Rahul         ₹300.00  │
│ ☐ (S) Sana                —  │
│                              │
│ ₹0 left to assign            │  aria-live="polite"
│ [          Done           ]  │
└──────────────────────────────┘
```

- Equally: checkboxes; amounts are read-only and recomputed live.
- Exact: amount inputs per person; remainder line shows what's left or over
  ("₹50 over the total").
- Percentages: percent inputs; remainder in percent and in rupees.
- Shares: small steppers (− 1 +); amounts recomputed live.
- All computation calls `lib/domain/splits.ts` (imported as a pure function);
  the component never does its own math.
- The remainder line is `text-debit` when not zero and `text-muted-foreground`
  at zero. It's announced to screen readers through `aria-live`.

### 6.9 Expense detail

Header: category icon, description, total (`Money tone="neutral"`), date, and
"Added by Aman on 28 Sep". Then two short lists: "Paid by" and "Split", each
row with a person and an amount. Then the viewer's line in words ("You owe
Priya ₹800"). Actions: "Edit" (primary) and a `DropdownMenu` with "Delete".
Below: a "History" section showing activity for this expense
("Aman changed the amount from ₹900 to ₹1,200").

Delete doesn't use a confirmation dialog. It removes the row, navigates back,
and shows a toast: "Expense deleted" with "Undo". Deletion is reversible, so a
confirmation step adds friction without adding safety.

### 6.10 Settle up

```
┌──────────────────────────────┐
│ Settle up with Priya         │
│                              │
│ You owe Priya ₹600           │
│                              │
│ Amount   [ ₹600          ]   │  prefilled, editable
│                              │
│ [    Pay ₹600 with UPI    ]  │  primary; only if Priya has a UPI ID
│ [ Record a cash payment   ]  │  outline
└──────────────────────────────┘
```

- "Pay with UPI" opens the UPI deep link. On return (page becomes visible
  again), the sheet shows "Did your payment to Priya go through?" with
  "Yes, record it" and "No".
- If the other person has no UPI ID: the UPI button is replaced by the line
  "Priya hasn't added a UPI ID yet." and "Record a cash payment" becomes
  primary.
- Overpaying shows an inline note in `text-muted-foreground`: "This is ₹200
  more than you owe. Priya will owe you ₹200."
- When the viewer is the one owed, the sheet is "Record a payment from Aman"
  with only the record option.
- Success toast: "Payment recorded".

### 6.11 Invite landing (`/j/[token]`)

A full page, public, with no app chrome.

Direct invite:

```
┌──────────────────────────────┐
│ (P)                          │  inviter avatar
│ Priya added you to Goa Trip  │
│ as "Rahul".                  │
│                              │
│ You owe Priya ₹1,450         │  debit, balance sentence style
│ across 3 expenses.           │
│                              │
│ ┌──────────────────────────┐ │
│ │ Dinner at Thalassa  ₹800 │ │  read-only preview, max 3 rows
│ │ Cab to airport      ₹400 │ │
│ │ Scuba deposit       ₹250 │ │
│ └──────────────────────────┘ │
│                              │
│ [ G  Continue with Google ] │
│ Use email instead            │
└──────────────────────────────┘
```

Group link: inviter, group name, "6 people", and "Join Goa Trip" as the
button text after sign-in. No balances.

Expired or revoked: "This invite link has expired. Ask Priya to send a new
one." No sign-in buttons.

### 6.12 Invite sheet (from a group)

- "Share invite link" (primary): opens the device share sheet with the text
  "Join Goa Trip on Spending Diary: <link>". Falls back to a WhatsApp link,
  then to "Copy link".
- A QR code of the link for people in the same room.
- "Add someone by name" for people who aren't on the app yet: a name field and
  an optional phone field, then the share step for their personal link.
- Admins see "Link expires in 12 days" and "Reset link".

### 6.13 Activity

Rows with an avatar of the actor, one sentence, and a relative time
("2 h ago"). Sentences are specific: "Aman added Dinner at Thalassa in Goa
Trip. You owe ₹800." Unread rows have a `size-2 rounded-full bg-credit` dot on
the left, never bold text. Tapping marks read and opens the item.

### 6.14 Insights (inside "You")

```
┌──────────────────────────────┐
│ ‹  September 2026  ›         │
│                              │
│ You spent ₹18,420            │  balance-sentence style, neutral
│ ₹2,100 less than August.     │
│                              │
│ [ Both ][ Shared ][ Personal]│  ToggleGroup
│                              │
│  (donut chart, 5 categories  │  shadcn Chart, chart-1..5,
│   + "Other")                 │  total in the center
│                              │
│ Food             ₹6,200  34% │  rows, sorted by amount
│ Rent             ₹5,000  27% │
│ Transport        ₹2,900  16% │
│ ...                          │
└──────────────────────────────┘
```

- The chart is supporting; the category rows are the real content and remain
  readable without the chart.
- Categories beyond the top five are grouped as "Other" in the chart but
  listed individually in the rows.
- A footnote explains the number once: "Your share of shared expenses plus
  your personal expenses. Payments to friends don't count as spending."

### 6.15 Settings (inside "You")

Grouped rows: Profile (name, photo, phone, UPI ID), Notifications (a `Switch`
per type), Devices (sessions with "Sign out"), Appearance (Light / Dark /
System), and at the bottom "Sign out" and "Delete account" (`destructive`,
with an `AlertDialog` because this one is irreversible).

## 7. Components

### 7.1 shadcn primitives to install

`button`, `input`, `label`, `form`, `textarea`, `select`, `checkbox`,
`switch`, `toggle-group`, `radio-group`, `calendar`, `popover`, `command`,
`dialog`, `drawer`, `sheet`, `alert`, `alert-dialog`, `dropdown-menu`,
`tabs`, `avatar`, `badge`, `separator`, `skeleton`, `scroll-area`,
`tooltip`, `sonner`, `progress`, `chart`, `sidebar`.

### 7.2 Variants to add via `cva()`

| Component | Variant | Look |
|---|---|---|
| `Badge` | `credit` | `bg-credit-muted text-credit` |
| `Badge` | `debit` | `bg-debit-muted text-debit` |
| `Badge` | `neutral` | `bg-muted text-muted-foreground` |
| `Button` | `fab` size | `size-14 rounded-full shadow-lg` with `default` variant colors |

### 7.3 Feature components

| Component | Folder | Notes |
|---|---|---|
| `Money` | `money/` | See section 4. The only way to render an amount. |
| `AmountInput` | `money/` | Large decimal input; emits minor units via `toMinor()`; shows the currency symbol from the group. |
| `BalanceSentence` | `balance/` | "Overall, you're owed ₹X" and its variants, per currency. |
| `PersonRow` | `people/` | Avatar, name (nickname-aware), meta, right-side balance. |
| `PersonAvatar` | `people/` | Photo or initials on `bg-muted`; placeholders get a dashed `border-border` ring. |
| `PeoplePicker` | `people/` | `Command`-based search over friends and group members, with "Add someone new". |
| `GroupRow` | `group/` | Type icon, name, member count, balance. |
| `ExpenseRow` | `expense/` | Date, icon, description, payer meta, viewer's position. |
| `ExpenseForm` | `expense/` | Section 6.7. |
| `SplitEditor` | `expense/` | Section 6.8. |
| `PaidByEditor` | `expense/` | Single or multiple payers. |
| `SettleSheet` | `settlement/` | Section 6.10. |
| `SuggestedPayments` | `balance/` | Simplified plan card. |
| `InviteSheet` | `invite/` | Section 6.12. |
| `InvitePreview` | `invite/` | Landing page content. |
| `ActivityRow` | `activity/` | Section 6.13. |
| `CategoryIcon` | `expense/` | Maps category to lucide icon in a muted square. |
| `EmptyState` | `common/` | One sentence plus up to two actions. No illustrations. |
| `ResponsiveDialog` | `common/` | Drawer on mobile, Dialog on desktop. |
| `RowList` | `common/` | `bg-card rounded-xl border divide-y` surface for rows. |

## 8. Patterns

### Forms

- `react-hook-form` with the shared Zod schema from `lib/validation/`.
- Validate on blur, then on change once a field has an error.
- Error text appears under the field in `text-destructive text-sm`, stating
  the fix: "Enter an amount greater than ₹0", not "Invalid input".
- The submit button shows a spinner and keeps its label ("Saving…") while
  pending, and is disabled to prevent double submits. The idempotency key is
  created when the form opens.

### Loading

- Skeletons shaped like the content, on first load only. Refetches keep the
  old data on screen (`placeholderData: keepPreviousData`).
- Never block a whole screen with a spinner.

### Feedback

- Success: `sonner` toast, bottom on mobile (above the nav), bottom-right on
  desktop. The toast repeats the action's verb: "Save" → "Expense saved".
- Reversible actions (delete expense, delete settlement, leave group while
  settled) use an Undo toast for 6 seconds instead of a confirmation.
- Irreversible or high-impact actions (delete account, remove a member with a
  balance, reset an invite link) use an `AlertDialog` whose confirm button
  names the action: "Remove Aman", not "OK".

### Errors

- Network failure on a mutation: toast "Couldn't save. Check your connection
  and try again." with "Retry". Form contents are kept.
- `409` conflict: the edit-conflict alert in 6.7.
- `403`/`404`: a full-screen message "This page isn't available. It may have
  been deleted, or you may not have access." with "Go home".

### Optimistic updates

- Adding and deleting expenses update the list immediately and roll back on
  error.
- Balance numbers are never optimistic; they show a subtle skeleton on the
  amount only until the server responds.

### Empty states

One sentence that says what to do, and at most two buttons. No illustrations,
no mood copy ("Nothing here yet!"). Examples:

- Groups: "Create a group for a trip, your flat, or anything you share." →
  "Create a group".
- Activity: "Changes to expenses you're in will show up here."
- Deleted expenses: "No deleted expenses."

## 9. Writing

Tone: plain, specific, friendly without being cute. Write from the user's side
of the screen.

| Use | Avoid |
|---|---|
| "You owe Priya ₹600" | "Outstanding balance: -₹600" |
| "Settle up" | "Clear dues", "Pay now" |
| "Record a cash payment" | "Mark as settled" |
| "Add expense" / "Expense saved" | "Create transaction" / "Success!" |
| "Invite people" | "Send invitations" |
| "Couldn't save. Check your connection." | "Oops! Something went wrong 😕" |

Vocabulary is fixed across the app: an action keeps its name from button to
toast to activity entry (Add expense → Expense added → "Aman added Dinner").

## 10. Accessibility and responsive checklist

- [ ] Every amount's direction is conveyed in words, not only by color.
- [ ] Text meets 4.5:1 contrast in light and dark themes.
- [ ] Touch targets are at least 44 px (`h-11` for rows and buttons on
      mobile).
- [ ] Visible focus ring (`ring`) on every interactive element.
- [ ] The split remainder and form errors are announced via `aria-live`.
- [ ] The add button and icon-only controls have `aria-label`s.
- [ ] Layouts work from 360 px wide up; nothing scrolls horizontally.
- [ ] `prefers-reduced-motion` disables row animations.
- [ ] Dark mode is checked for every new screen.
- [ ] The ₹ sign renders in IBM Plex Sans, not a fallback font.

## 11. What not to do

- Don't put each row in its own card with a shadow.
- Don't use `destructive` red for "you owe".
- Don't use colored primary buttons; primary is ink.
- Don't add gradients, glassmorphism, or decorative illustrations.
- Don't show a number without saying what direction it goes.
- Don't animate balances.
- Don't use all-caps labels or middle-dot meta strings.
- Don't hand-format money or compute splits in a component.