/**
 * Split computation — the only place splits and rounding are calculated.
 * All functions are pure (no DB, no I/O) and have unit tests.
 *
 * Money is always integer minor units (paise). Largest-remainder rounding
 * ensures SUM(shares) === total exactly.
 */

export interface RawParticipant {
  userId: string;
  /** For EXACT splits: owed amount in minor units */
  exactOwed?: number;
  /** For PERCENTAGE splits: percentage (e.g. 25.5 for 25.5%) */
  percentage?: number;
  /** For SHARES splits: number of shares (e.g. 2) */
  shares?: number;
}

export interface Participant {
  userId: string;
  paid: number;
  owed: number;
}

// ─── Largest-remainder rounding ─────────────────────────────────────

interface WeightedItem {
  userId: string;
  exact: number;  // real (floating point) share
}

/**
 * Given real-valued shares that sum to `total` (approximately), distribute
 * `total` integer minor units using largest-remainder (Hamilton) rounding
 * so that SUM(result) === total exactly.
 */
export function largestRemainder(items: WeightedItem[], total: number): Map<string, number> {
  const floors = items.map((item) => ({
    userId: item.userId,
    floor: Math.floor(item.exact),
    remainder: item.exact - Math.floor(item.exact),
  }));

  const sumFloors = floors.reduce((s, x) => s + x.floor, 0);
  let leftover = total - sumFloors;

  // Sort descending by fractional remainder, break ties by userId for stability
  const sorted = [...floors].sort((a, b) =>
    b.remainder !== a.remainder ? b.remainder - a.remainder : a.userId.localeCompare(b.userId),
  );

  const result = new Map<string, number>();
  for (const item of sorted) {
    result.set(item.userId, item.floor + (leftover-- > 0 ? 1 : 0));
  }

  return result;
}

// ─── Split algorithms ────────────────────────────────────────────────

/**
 * Split `total` equally among `userIds`.
 */
export function splitEqual(userIds: string[], total: number): Map<string, number> {
  if (userIds.length === 0) return new Map();
  const each = total / userIds.length;
  const items: WeightedItem[] = userIds.map((userId) => ({ userId, exact: each }));
  return largestRemainder(items, total);
}

/**
 * Validate and return exact splits.
 * Throws if the sum doesn't equal the total.
 */
export function splitExact(
  participants: Array<{ userId: string; owed: number }>,
  total: number,
): Map<string, number> {
  const sum = participants.reduce((s, p) => s + p.owed, 0);
  if (sum !== total) {
    throw new Error(
      `Exact splits sum to ${sum} but expense total is ${total}`,
    );
  }
  return new Map(participants.map((p) => [p.userId, p.owed]));
}

/**
 * Split by percentage. Percentages must sum to exactly 100.
 */
export function splitPercentage(
  participants: Array<{ userId: string; percentage: number }>,
  total: number,
): Map<string, number> {
  const sumPct = participants.reduce((s, p) => s + p.percentage, 0);
  // Allow 0.01 tolerance for floating-point sums
  if (Math.abs(sumPct - 100) > 0.01) {
    throw new Error(
      `Percentages sum to ${sumPct}, expected 100`,
    );
  }
  const items: WeightedItem[] = participants.map((p) => ({
    userId: p.userId,
    exact: (p.percentage / 100) * total,
  }));
  return largestRemainder(items, total);
}

/**
 * Split by shares (e.g. 1:1:2).
 */
export function splitShares(
  participants: Array<{ userId: string; shares: number }>,
  total: number,
): Map<string, number> {
  const totalShares = participants.reduce((s, p) => s + p.shares, 0);
  if (totalShares <= 0) {
    throw new Error("Total shares must be greater than zero");
  }
  const items: WeightedItem[] = participants.map((p) => ({
    userId: p.userId,
    exact: (p.shares / totalShares) * total,
  }));
  return largestRemainder(items, total);
}

// ─── Ledger-edge computation ─────────────────────────────────────────

export interface LedgerEdge {
  debtorId: string;
  creditorId: string;
  amount: number;
}

/**
 * Given the paid and owed amounts for each participant, compute the set of
 * directed pairwise debt edges that represent who owes whom.
 *
 * Algorithm: pro-rata creditor allocation. Each payer's credit is distributed
 * to debtors proportionally to how much each owes relative to the total owed
 * by all participants who owe more than they paid.
 *
 * A person with paid > owed is a net creditor; paid < owed is a net debtor.
 * This function never generates self-edges (debtor === creditor).
 */
export function computeLedgerEdges(participants: Participant[]): LedgerEdge[] {
  const creditors: Array<{ userId: string; credit: number }> = [];
  const debtors: Array<{ userId: string; debt: number }> = [];

  for (const p of participants) {
    const net = p.paid - p.owed;
    if (net > 0) creditors.push({ userId: p.userId, credit: net });
    else if (net < 0) debtors.push({ userId: p.userId, debt: -net });
  }

  const edges: LedgerEdge[] = [];

  // For each debtor, distribute debt to creditors pro-rata
  for (const debtor of debtors) {
    const totalCredit = creditors.reduce((s, c) => s + c.credit, 0);
    let remaining = debtor.debt;

    const sortedCreditors = [...creditors].sort(
      (a, b) => a.userId.localeCompare(b.userId),
    );

    for (let i = 0; i < sortedCreditors.length; i++) {
      const creditor = sortedCreditors[i]!;
      if (creditor.credit <= 0) continue;

      const isLast = i === sortedCreditors.length - 1 ||
        sortedCreditors.slice(i + 1).every((c) => c.credit <= 0);

      const amount = isLast
        ? remaining
        : Math.round((creditor.credit / totalCredit) * debtor.debt);

      if (amount > 0) {
        edges.push({
          debtorId: debtor.userId,
          creditorId: creditor.userId,
          amount,
        });
        remaining -= amount;
      }
    }
  }

  return edges;
}
