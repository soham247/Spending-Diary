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
2. **Separate brand and money meaning.** Burnt orange identifies primary
   actions. Teal means someone owes you; amber means you owe. Always pair
   balance colours with words, and never use the brand colour to communicate
   a money direction.
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

The product uses the founder-supplied shadcn OKLCH theme, adopted on
2026-11-06. White and neutral surfaces support burnt-orange primary actions
and a matching five-step chart palette. The same tokens apply across the
landing page, forms, app shell, and shadcn components.

`src/app/globals.css` is the source of truth. All tokens, including the
`sidebar-*` family, are mapped through Tailwind v4 `@theme inline`. Use
semantic classes such as `bg-primary`, `text-muted-foreground`,
`bg-sidebar`, and `border-sidebar-border`. Alpha values inside the supplied
CSS tokens are intentional; feature classes still must not apply opacity
modifiers to semantic tokens.

The existing `credit`, `debit`, their muted/foreground variants, and
`destructive-foreground` extend the supplied palette for financial meaning
and compatibility. Every amount still renders through `Money`. Primary
actions are burnt orange, replacing the earlier ink-button rule.

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.555 0.163 48.998);
  --primary-foreground: oklch(0.987 0.022 95.277);
  --secondary: oklch(0.967 0.001 286.375);
  --secondary-foreground: oklch(0.21 0.006 285.885);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.879 0.169 91.605);
  --chart-2: oklch(0.769 0.188 70.08);
  --chart-3: oklch(0.666 0.179 58.318);
  --chart-4: oklch(0.555 0.163 48.998);
  --chart-5: oklch(0.473 0.137 46.201);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.666 0.179 58.318);
  --sidebar-primary-foreground: oklch(0.987 0.022 95.277);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
  --radius: 0.625rem;
  --destructive-foreground: #ffffff;
  --credit: #0f766e;
  --credit-foreground: #ffffff;
  --credit-muted: #ddf1ee;
  --debit: #b45309;
  --debit-foreground: #ffffff;
  --debit-muted: #fbebd9;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.473 0.137 46.201);
  --primary-foreground: oklch(0.987 0.022 95.277);
  --secondary: oklch(0.274 0.006 286.033);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.879 0.169 91.605);
  --chart-2: oklch(0.769 0.188 70.08);
  --chart-3: oklch(0.666 0.179 58.318);
  --chart-4: oklch(0.555 0.163 48.998);
  --chart-5: oklch(0.473 0.137 46.201);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.769 0.188 70.08);
  --sidebar-primary-foreground: oklch(0.279 0.077 45.635);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
  --destructive-foreground: #111615;
  --credit: #3cc2ae;
  --credit-foreground: #111615;
  --credit-muted: #12302d;
  --debit: #f0a05a;
  --debit-foreground: #111615;
  --debit-muted: #35240f;
}
```

Primary buttons use `primary` and `primary-foreground`. Sidebar surfaces and
selection states use their dedicated sidebar tokens. Do not use credit or
debit colours for navigation or general actions. Chart labels and legends
remain necessary because neighbouring orange shades are close in hue.

### 3.2 Typography

**Typeface: Oxanium**, selected by the Nova preset, loaded with
`next/font/google`. Body and heading tokens share the same family.
Fallback: `system-ui, sans-serif`.

Before shipping, verify in the browser that the ₹ glyph renders in Plex (not
from a fallback font) and that `font-variant-numeric: tabular-nums` changes
digit widths.

| Role             | Classes                                                                                       | Where                                 |
| ---------------- | --------------------------------------------------------------------------------------------- | ------------------------------------- |
| Balance sentence | `text-2xl font-normal leading-snug`, amount inside it `text-4xl font-semibold tracking-tight` | Home, group, friend headers           |
| Screen title     | `text-xl font-semibold`                                                                       | Top of each screen                    |
| Section heading  | `text-sm font-medium text-muted-foreground`                                                   | Above lists ("Groups", "This month")  |
| Row title        | `text-base font-medium`                                                                       | Person, group, expense names          |
| Body             | `text-sm`                                                                                     | Most text                             |
| Meta             | `text-sm text-muted-foreground`                                                               | "Priya paid ₹1,200" under a row title |
| Row amount       | `text-base font-medium tabular-nums`                                                          | Right side of rows                    |
| Small print      | `text-xs text-muted-foreground`                                                               | Timestamps, helper text               |

Rules:

- Sentence case everywhere. No all-caps labels, no letter-spaced eyebrows
  above headings.
- Meta lines are sentences or comma-separated phrases ("Priya paid ₹1,200,
  split 4 ways"), not strings joined with middle dots.
- Prose stays under about 70 characters per line. The workspace can expand
  to `max-w-7xl`; forms retain their own narrower constraints.

### 3.3 Spacing, radius, elevation

- **Spacing:** Tailwind scale only. Screen padding `px-4` on mobile, `px-6` on
  desktop. Rows `py-3`. Sections separated by `space-y-6`.
- **Radius:** inherit the Nova primitive's radius. Rows inside a grouped
  surface have no extra radius and are separated by `divide-y`.
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

The public landing page uses a single 200ms fade/4px rise on hero text, smooth anchor scrolling, and a 2px CTA-arrow movement on hover or keyboard focus (150ms). These effects only run with `prefers-reduced-motion: no-preference`; hover motion requires a fine pointer. Previews and financial amounts stay static. Implement in CSS without scroll listeners or animation dependencies.

## 4. Money display

Every amount renders through one component: `<Money />`
(`components/money/Money.tsx`).

```tsx
type MoneyProps = {
  minor: number; // integer minor units
  currency: string; // "INR"
  tone?: "auto" | "neutral"; // auto: credit if > 0, debit if < 0
  sign?: "never" | "always"; // default "never": direction comes from words
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

| State                 | Row right side                                 | Color              |
| --------------------- | ---------------------------------------------- | ------------------ |
| They owe you          | `owes you` / `₹450` (two lines, right-aligned) | `credit`           |
| You owe them          | `you owe` / `₹450`                             | `debit`            |
| Settled               | `settled up`                                   | `muted-foreground` |
| Expense you're not in | `not involved`                                 | `muted-foreground` |

## 5. Layout and navigation

The authenticated shell uses the official shadcn `Sidebar`, generated with
the CLI using the `new-york` style and Tailwind v4 configuration. Compose
feature navigation from sidebar primitives; do not hand-edit generated
files under `components/ui`.

### Desktop (>= 768 px)

- A left sidebar starts expanded and can collapse to icons through a toggle
  inside its own header or the standard Ctrl/Cmd+B shortcut. Collapsed items have
  tooltips and retain accessible names.
- The header contains the Spending Diary brand and an Add expense shortcut.
- Main destinations: Home, My spending, Groups, Friends, Activity, Insights.
  Settings and Sign out stay at the bottom.
- Active destinations include their detail routes and expose `aria-current`.
- Every authenticated screen uses one shared `PageHeader` for its title,
  optional description and actions. There is no separate shell title bar.
  The header stays outside the scrolling content; the sidebar remains independent. The
  shell fills the dynamic viewport and the content pane owns page scrolling.
- Content uses the available width up to `max-w-7xl` including page padding.
  Home shows People and Groups side by side from the `xl` breakpoint.

### Mobile (< 768 px)

- A floating bottom pill offers labelled Home, Spending, Groups and Friends
  destinations. The active destination includes its detail routes.
- The same sidebar opens as a shadcn Sheet from the header menu toggle,
  retaining all destinations, including Activity, Insights and Settings.
- The mobile menu button lives in the same `PageHeader` row as the title.
  Title and actions wrap as needed; desktop hides only the menu button.
  Loading, error and onboarding states retain a header with menu access.
- The drawer has an explicit close button, traps focus, closes with Escape,
  and returns focus to the trigger. Choosing a destination closes it.
- Navigation rows and action buttons have at least 44px touch targets on mobile.
- The drawer footer and bottom pill reserve the device bottom safe area.
  Content and scroll padding reserve room for the pill so it cannot cover
  the final row or a focused control. The pill hides while the menu is open.
  At 360px, neither content nor drawer may overflow.
- Group/friend expense actions retain their existing prefilled context.

### Sheets vs dialogs

Forms use the official shadcn `Drawer` on both mobile and desktop through
`components/common/FormDrawer`. Bottom drawers fill the mobile width. At the
`md` breakpoint (768px) and above, drawers open from the right at full viewport
height with a `max-w-2xl` width. Mobile height follows content up to the dynamic
viewport; the header stays visible and the body scrolls with safe-area padding.
Save actions stay sticky inside the body. The existing navigation sidebar
continues to use its Sheet.

Drawers provide Close, Escape and browser Back dismissal, return focus to their
trigger, and confirm before discarding an edited draft. Pending writes and UPI
confirmation block dismissal. Only the mobile handle initiates dragging; desktop
drawers have no drag handle. Edited drafts cannot be swiped away. Expense
payer and split editors replace the composer body without nesting drawers.
Group/person creation and nickname editing open from buttons instead of taking
space above lists. Existing expense deep links still open their editor.

Full-screen pages remain for onboarding and invite landing.

## 6. Screens

Each screen lists its purpose, layout, and states. Copy in quotes is the actual
copy to use.

### 6.1 Login

A focused auth surface with a home-linked wordmark, one heading and a compact shadcn Card. The currently unavailable Google option comes first as a disabled button with a monochrome Google brand icon and a short status line, followed by the email/password form (D-033). Email sign-in is immediately visible. Sign-up and password-recovery links remain available, and callback paths survive switching between login and signup.

Use shared Zod form schemas and react-hook-form, field errors linked through aria-describedby, standard autocomplete attributes and a labelled Show/Hide password button. Never trim passwords or prevent pasting. Only pending operations show a spinner and disable inputs; failures preserve values. Use the shadcn destructive Alert for server errors. Invite context stays visible without assuming the invite type.

### 6.2 Signup and verification

Signup shares the login layout and disabled Google option, adding name and a new-password field. The existing policy is 8 to 128 characters, without composition rules. Successful signup clears the password and shows "Check your inbox", the destination email, a request-another-link action and a sign-in link preserving the callback. Verification remains required before sign-in (D-019/D-020); there are no magic links or /auth/confirm flows. Forgot/reset-password pages inherit the shared auth shell without changing their behavior.

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

Friends exposes a labelled Pay a friend action in the persistent header beside
Add friend, at every screen width. It opens the existing payment drawer with
Direct selected and no friend preselected. Users choose the person, scope,
direction, amount and method using the same payment flow as friend details.

Each friend row also has a separate three-dot button with text-only Pay [name],
Edit nickname and Block/Unblock items. Pay opens the existing payment form with
that friend selected and Direct as the initial scope. Keep the row link and
menu button separate, preserve draft protection, restore focus to the row menu
button when its drawer closes and retain Undo for blocking. Existing server
guards still restrict payments involving blocked friends to eligible repayments.

The approved shared-ledger polish retains Nova, Oxanium and text-only menus.
Friends uses 12px control grouping and a quiet Track by name action; hover and
focus surfaces extend across the full friend row. Detail summaries avoid
repeating the header name, emphasize the overall amount at 30px and group scope
balances into one divided surface with secondary settlement buttons. Keep
Shared expenses and Payments tabs, with one visible label per tab section.
Payment drawers retain field order and behavior, use full-width 44px selects,
the shared 64px AmountInput with 36px figures, and paired date/method fields on
larger screens. Person and Paid by labels use payment sentences for direction.
Keep loading, retry, no-eligible-person states, draft protection, payment
confirmation and UPI return handling. The primary footer action is UPI when
available, otherwise Record payment. Craft guidance remains
[unslop by Damir Sokolovsky](https://heydamir.design/unslop), CC BY 4.0.

Friends uses the compact Expenses header, a searchable alphabetical list and
All, Outstanding, Settled up and Blocked filters. Search and filters stay in
the URL and survive returning from a friend. Each row shows a signed net
balance separately per currency; tracked names and blocked friends retain
their status labels. Loading never implies a zero balance. No-match results
offer Reset filters.

Friend details use the same centered content width and section rhythm as
expense details. Show the overall balance per currency, then settlement
shortcuts for each nonzero direct or group scope, including offsetting scopes.
Keep Record payment available and explain blocked relationships. Below the
balance and invitation sections, Shared expenses and Payments are keyboard
accessible tabs, with Shared expenses selected first. Show the fetched history
page and link to each complete filtered history. Reuse ExpenseHistoryRow
for the viewer's share, secondary bill total and return navigation. Payment
rows show date, scope, method and notes; deletion lives in the row menu with
Undo. Both tabs have explicit empty states.

Research: [Splitwise's balance and friend details](https://blog.splitwise.com/2019/07/09/splitwise-redesigned/)
and [NN/g's actionable empty states](https://www.nngroup.com/articles/empty-state-interface-design/).
Craft guidance: [unslop by Damir Sokolovsky](https://heydamir.design/unslop), CC BY 4.0.

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

- **Amount first.** Desktop drawers focus the first available input, waiting for
  asynchronously loaded forms unless the user has already moved focus. Mobile
  drawers focus their title so the keyboard opens only after tapping a field.
  The amount field uses `text-4xl tabular-nums`,
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

The current create flow follows D-034: amount and description first, then a
**With** row of selected friends or the selected group and **Add people or
group** / **Change group**. One searchable picker replaces the mixed context
dropdown. Global creation starts personal; friend and group entry points
prefill their context. Personal creation hides payer/split controls until
others are included. Changing context preserves the purchase details and
explains any reset of custom allocations before applying it. Choosing a
single payer returns immediately. The collapsed details row shows the date
(**Today** by default), category and **Details**. The preview shows the
viewer's share and domain-derived debts in words. An untouched empty amount
does not show an error just because the people picker was opened. Payer,
people and split editors stay inside the same Drawer.

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

Keep the persistent header with description, category, Back, an accessible
pencil Edit icon and an expense-actions dropdown containing Delete expense.
Back retains the originating
history filters. Use a compact reading width, readable calendar date, group
context or Direct expense, bill total (`Money tone="neutral"`) and creator
attribution when the creator's name is available. Shared expenses pair Your share
with You paid, then divided Paid by and split lists. Label the saved split method
and show percentage/share weights. Payer-only participants stay in Paid by and
out of the split; included zero-share participants remain in the split.
These amounts describe this expense, never a current outstanding balance.
Personal expenses show one amount without repeating payer and split lists.
Notes have a heading and wrap long text. History shows the latest three events,
expandable before/after changes and Show older activity. Unknown legacy snapshots
retain a plain event summary. Loading and retry states remain local to the share
and history sections, without showing a false zero.

Expense-detail polish keeps the selected Nova theme, Oxanium font, section order
and pencil Edit control. Group the bill and personal share in one summary with
16px internal spacing and a quiet dashed receipt divider. Use 24px between
sections, 16px medium-weight section headings, and neutral tabular amounts.
Keep divided participant lists in their existing surfaces; History uses a simple
ruled timeline. Expanded events show their before/after details once, without
repeating the collapsed preview. Craft guidance: [unslop by Damir Sokolovsky](https://heydamir.design/unslop), CC BY 4.0.

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
- Overpaying requires a confirmation showing the resulting balance, for example: "Priya will owe you ₹200."
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

#### Personal spending list

The `/expenses` screen defaults to **My spending**, with an inclusive date range
from the first of the current local calendar month through today. Show the
filtered total above the expense rows, using the viewer's owed share and separate
totals per currency. Each row shows the viewer's share and the original expense
total. Personal/shared/both filters and a **This month** reset narrow the diary;
**All expenses** and **Deleted expenses** retain the existing history views.
Totals cover all matching pages and exclude deleted expenses and settlements.
Invalid date ranges show an inline error; loading and failures never show a false
zero. Empty valid ranges show zero with guidance to change dates or add an expense.

### 6.15 Settings

Grouped rows: Profile (name, photo, phone, UPI ID), Notifications (a `Switch`
per type), Devices (sessions with "Sign out"), Appearance (Light / Dark /
System), and at the bottom "Sign out" and "Delete account" (`destructive`,
with an `AlertDialog` because this one is irreversible).

Use the Settings page title and a consistent section layout: Profile, Privacy,
Notifications, Signed-in devices, Appearance and Account. Stack section headings
above controls on mobile and align them in a separate column on large screens.
Keep section headings free of descriptive subtitles and omit the extra page
introduction, auto-save explanation, system-theme explanation and pre-deletion
confirmation hint. Retain necessary field labels, privacy guidance, errors and
the irreversible-deletion explanation inside its confirmation dialog.

Use the preset's controls and semantic tokens, including the CLI-generated radio
group for Light, Dark and System. The profile has its own Save profile action;
switches retain their existing immediate-save behavior. Align View spending
insights with the content text at the left on mobile, and place it on the right
from the small breakpoint. Keep the existing page shell and mobile safe areas.
Design refinement follows [Unslop by Damir Sokolovsky](https://heydamir.design/unslop), CC BY 4.0.

## 7. Components

### Preset ownership (D-031)

Use the shadcn `radix-nova` preset (`b1FQgMFSC`) as the component design
system. Primitives own their typography, padding, radii, heights, and states.
Use their default sizes unless a specific role needs a named size (for
example, an icon button). Avoid per-screen height and padding overrides on
ordinary controls. Keep generated primitives managed by the shadcn CLI.

Use Card/Header/Title/Description/Content/Footer for standalone panels,
Tabs for expense views, Alert for errors, and Avatar for person initials.
Grouped lists compose one Card with zero outer vertical padding and gap,
with divided rows inside; do not turn every list row into a separate card.
Page grids, section gaps, and list-row layout remain feature composition.

Below the `md` breakpoint, shared styles provide 44px touch targets for
inputs, buttons, select triggers, sidebar controls, and tabs. Desktop uses
the preset's compact sizes. The large amount-entry field remains an
intentional exception. Retain Money and the credit/debit tokens.

### 7.1 shadcn primitives to install

`button`, `input`, `label`, `form`, `textarea`, `select`, `checkbox`,
`switch`, `toggle-group`, `radio-group`, `calendar`, `popover`, `command`,
`dialog`, `drawer`, `sheet`, `alert`, `alert-dialog`, `dropdown-menu`,
`tabs`, `avatar`, `badge`, `separator`, `skeleton`, `scroll-area`,
`tooltip`, `sonner`, `progress`, `chart`, `sidebar`.

### 7.2 Variants to add via `cva()`

| Component | Variant    | Look                                                           |
| --------- | ---------- | -------------------------------------------------------------- |
| `Badge`   | `credit`   | `bg-credit-muted text-credit`                                  |
| `Badge`   | `debit`    | `bg-debit-muted text-debit`                                    |
| `Badge`   | `neutral`  | `bg-muted text-muted-foreground`                               |
| `Button`  | `fab` size | `size-14 rounded-full shadow-lg` with `default` variant colors |

### 7.3 Feature components

| Component           | Folder        | Notes                                                                                             |
| ------------------- | ------------- | ------------------------------------------------------------------------------------------------- |
| `Money`             | `money/`      | See section 4. The only way to render an amount.                                                  |
| `AmountInput`       | `money/`      | Large decimal input; emits minor units via `toMinor()`; shows the currency symbol from the group. |
| `BalanceSentence`   | `balance/`    | "Overall, you're owed ₹X" and its variants, per currency.                                         |
| `PersonRow`         | `people/`     | Avatar, name (nickname-aware), meta, right-side balance.                                          |
| `PersonAvatar`      | `people/`     | Photo or initials on `bg-muted`; placeholders get a dashed `border-border` ring.                  |
| `PeoplePicker`      | `people/`     | `Command`-based search over friends and group members, with "Add someone new".                    |
| `GroupRow`          | `group/`      | Type icon, name, member count, balance.                                                           |
| `ExpenseRow`        | `expense/`    | Date, icon, description, payer meta, viewer's position.                                           |
| `ExpenseForm`       | `expense/`    | Section 6.7.                                                                                      |
| `SplitEditor`       | `expense/`    | Section 6.8.                                                                                      |
| `PaidByEditor`      | `expense/`    | Single or multiple payers.                                                                        |
| `SettleSheet`       | `settlement/` | Section 6.10.                                                                                     |
| `SuggestedPayments` | `balance/`    | Simplified plan card.                                                                             |
| `InviteSheet`       | `invite/`     | Section 6.12.                                                                                     |
| `InvitePreview`     | `invite/`     | Landing page content.                                                                             |
| `ActivityRow`       | `activity/`   | Section 6.13.                                                                                     |
| `CategoryIcon`      | `expense/`    | Maps category to lucide icon in a muted square.                                                   |
| `EmptyState`        | `common/`     | One sentence plus up to two actions. No illustrations.                                            |
| `FormDrawer`        | `common/`     | Bottom Drawer on mobile, right-side Drawer on desktop, guarded dismissal and shared form state.   |
| `RowList`           | `common/`     | `bg-card rounded-xl border divide-y` surface for rows.                                            |

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

| Use                                     | Avoid                             |
| --------------------------------------- | --------------------------------- |
| "You owe Priya ₹600"                    | "Outstanding balance: -₹600"      |
| "Settle up"                             | "Clear dues", "Pay now"           |
| "Record a cash payment"                 | "Mark as settled"                 |
| "Add expense" / "Expense saved"         | "Create transaction" / "Success!" |
| "Invite people"                         | "Send invitations"                |
| "Couldn't save. Check your connection." | "Oops! Something went wrong 😕"   |

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
- [ ] The ₹ sign renders clearly with the preset font and its fallback.

## 11. What not to do

- Don't put each row in its own card with a shadow.
- Don't use `destructive` red for "you owe".
- Use the preset's primary button colors for primary actions.
- Don't add gradients, glassmorphism, or decorative illustrations.
- Don't show a number without saying what direction it goes.
- Don't animate balances.
- Don't use all-caps labels or middle-dot meta strings.
- Don't hand-format money or compute splits in a component.

### Custom payment form (D-029)

Friend details always offer Record payment, including at zero balance; group pages offer it for active members and former members with remaining debt. Balance-row Settle up shortcuts prefill the amount and direction. The shared sheet has explicit payer/receiver, amount, calendar date, payment method and an optional note (2,000 characters). Friend entry defaults to Direct and offers one eligible group at a time; group entry locks the scope. Notes use the shadcn textarea and appear in payment history and Activity.

At zero balance, on a debt-increasing payment, or on an overpayment that reverses the balance, show a confirmation stating the resulting balance before saving or opening UPI. Cancel preserves the form without recording anything. Normal partial/full repayments need no extra confirmation. Former members and blocked pairs only repay existing pairwise debt without overpaying. Former members retain payment delete/Undo controls after reaching zero; archived groups remain read-only.

Payment Activity uses the transfer icon and names both payer and receiver, with explicit deleted/restored wording. Payments never count as spending. Loading, error/retry and no-eligible-person states appear inside the sheet. Amounts render through Money and inputs preserve their values after a failed save.

### Public landing page

The landing page uses a sticky, solid-background navbar, a short split-layout hero and a static, explicitly labelled dinner example. Anchor targets clear the navbar. Three product capabilities are shown through code-native previews: splitting shared costs, personal spending by owed share, and recording confirmed UPI repayments. Supporting text stays to one sentence per feature, with no repeated eyebrow labels, stock imagery, animation or charting dependencies. Keep the selected theme and font; previews use semantic tokens, shadcn primitives and Money. Stack previews at mobile widths and preserve 44px action targets.

Design direction: shared spending for friends; calm, exact and warm; a well-kept notebook; the balance sentence and repayment receipt carry the visual detail; the paid amount and personal share remain visibly distinct. Craft guidance informed by [unslop by Damir Sokolovsky](https://heydamir.design/unslop), CC BY 4.0.

The Unslop polish keeps the selected font, palette and section order. Use a single surface for the dinner preview, a wider spending breakdown beside a compact repayment receipt, and the preset's `lg` action size. Keep labels direct, remove redundant directional icons, and use a quiet dashed divider to separate the bill/share summary from repayments. Preserve native desktop control sizing rather than introducing landing-only button heights.

Auth Unslop direction: shared spending for friends; calm, exact and warm; the diary as a quiet working surface; one active email submit action and a clear verification result; the recognizable Google mark as a brand-specific exception to the interface icon set. Keep the selected font, palette and card structure. Tighten form grouping, place recovery beside the password label, and keep helper text brief. Google is disabled in both UI and the production provider configuration (D-033). Craft guidance: unslop by Damir Sokolovsky, CC BY 4.0 (credited above).

## Friend discovery and connection requests (D-036)

Friends has one primary Add friend action with a search input labelled Search by name or full email. Name searches cover existing friends and active shared-group members. A complete email can find another account only when its owner opts in under Settings > Privacy. Email discovery is off by default, and email addresses never appear in search results or connection profiles. An unmatched search says No matching person found and offers a personal connection link with share, copy, QR and revoke actions. Known friends open their existing detail page; unrelated accounts offer Send friend request; pending requests show their direction.

Add friend follows the approved shared-ledger polish: a short Send a request or
share a link subtitle, one labelled 44px search field and a separate Connect
with a link section before a query is entered. Keep the initial view limited
to controls and section labels; show acceptance guidance after sending a request
or generating a link, without repeated explanatory paragraphs.
Create connection link generates the link; existing share, copy, QR and revoke
actions remain available afterwards. Clear search restores focus to the input.
Results use divided person rows with the name above quiet relationship context.
Search loading uses two compact row placeholders; errors offer an inline retry
without navigating away. No-match states use a simple divider and invitation
action, avoiding a second boxed panel around the generated link. Shared expense
picker behavior, privacy and request acceptance remain unchanged. Craft guidance:
[unslop by Damir Sokolovsky](https://heydamir.design/unslop), CC BY 4.0.

Incoming requests appear in Friends with Accept and Decline; outgoing requests show Request pending. Opening a connection link offers Send friend request and explains that acceptance is required. Pending requests never appear as eligible direct-expense participants. Loading, retryable error and no-match states remain explicit. The expense people picker embeds the same discovery results and invitation actions without navigating away or submitting the expense. Existing selection, amount, description, date, category, notes and allocations stay intact until the user applies a selection. Track-by-name placeholders retain their distinct history-claim invitation flow.

Request inboxes use viewer-scoped cursor pagination with 30 items per page. Both parties can compare an eight-character request code through an existing trusted conversation when display names are ambiguous; the code is a display aid and never an authorization credential. Declining a request closes it permanently; repeat requests from the same sender are throttled for seven days, including reuse of the same declined connection link. A different valid connection link may still be used after an email-origin decline. Failed and repeated request attempts count toward the per-viewer limit.

### Persistent page headers (D-039)

Keep one compact page header above the independently scrolling body on every authenticated screen, including loading, empty and error states. Use a solid background and bottom border, 8px vertical padding on mobile and 12px on desktop. Titles use 18px mobile and 20px desktop type; long names wrap. Add-expense header actions use a 44px plus button on mobile with an accessible action name and a visible label on desktop. Keep the mobile sidebar trigger in the title row and the desktop toggle inside the sidebar. Preserve existing theme tokens, focus restoration and bottom navigation. Polish follows the existing calm, exact diary direction, with financial content carrying the visual emphasis. Craft guidance: [Unslop by Damir Sokolovsky](https://heydamir.design/unslop), CC BY 4.0.

On Expenses, the month selector, Filters action and Both/Personal/Shared quick filters occupy a stationary controls area below the page-header divider. The monthly history scrolls below it. D-040 supersedes the My spending/All tabs and large spending summary.

### Monthly expense history (D-040)

Each active month header is one full-width link with a quiet ArrowUpRight icon beside the spending amount and an accessible View insights for [month] label. It navigates in the same tab to /insights?month=YYYY-MM. Keep a 44px touch target, a visible keyboard focus outline and a quiet hover surface. Insights validates the month using its shared input schema and defaults to the current month when the URL value is missing or invalid. Deleted-history headings omit the link because deleted expenses do not count as spending.

Default to the latest month with matching expenses. The selector lists available calendar months with years and All months; custom dates override month selection. Use November ’26 month headings with right-aligned viewer spending totals computed across all pages, separately per currency. Shared rows pair a prominent owed share with a quieter Bill amount; personal rows show one amount. Whole rows open details, titles wrap to two lines, dates use readable day/month text and amounts stay aligned. Include group expenses without my share is an advanced opt-in; those rows say No share. Deleted expenses live in the overflow menu and offer Restore without a spending total. Advanced filters use a bottom sheet on phones and a right sheet on desktop, with draft values, inline date errors, Reset and Apply filters. Preserve filters in the URL and scroll on returning from details. Loading and errors never display a false zero. Keep a quiet empty state with Reset filters. The history begins directly below the controls, without the explanatory row or large summary card. Maintain Nova tokens, selected font, 44px mobile controls, visible focus, clear bottom-navigation space and reduced motion. Craft guidance: [unslop by Damir Sokolovsky](https://heydamir.design/unslop), CC BY 4.0.


### Back navigation (D-041)

Use the shared BackButton for return navigation: one ArrowLeft icon, a 44px ghost target at every width, a destination-specific accessible name and native tooltip. Place it at the start of detail page headers and auth content, and beside form-step headings. On detail screens, the back arrow replaces the mobile sidebar toggle; main screens retain the menu toggle. The desktop sidebar keeps its own toggle. This follows the user's explicit preference and supersedes the every-screen menu requirement in D-039. Detail arrows navigate to explicit parent destinations; expense history passes its URL into details so returning restores filters and existing scroll restoration. Direct expense links fall back to Expenses. Form-step arrows return inside the open drawer and restore focus without discarding the expense draft. Menus retain text alongside their back icon for scanning. Loading and error states retain the same return control. This navigation exception supersedes the general preference for text labels in section 2.
