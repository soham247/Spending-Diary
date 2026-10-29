export interface RawParticipant { userId: string; exactOwed?: number; percentage?: number; shares?: number }
export interface Participant { userId: string; paid: number; owed: number }
export interface LedgerEdge { debtorId: string; creditorId: string; amount: number }
interface WeightedItem { userId: string; exact: number }
interface Weight { userId: string; weight: bigint }

function validateTotal(total: number) {
  if (!Number.isSafeInteger(total) || total < 0) throw new Error("Total must be nonnegative integer minor units");
}
function unique(ids: string[]) {
  if (new Set(ids).size !== ids.length) throw new Error("Participants must be unique");
}
function decimalWeights(items: WeightedItem[]): { items: Weight[]; scale: bigint } {
  const decimals = items.map(item => {
    if (!Number.isFinite(item.exact) || item.exact < 0) throw new Error("Weights must be nonnegative");
    const [mantissa, exponent = "0"] = String(item.exact).toLowerCase().split("e");
    const [whole, fraction = ""] = mantissa!.split(".");
    const places = fraction.length - Number(exponent);
    return { userId: item.userId, digits: BigInt(whole! + fraction), places };
  });
  const places = Math.max(0, ...decimals.map(d => d.places));
  return { items: decimals.map(d => ({ userId: d.userId, weight: d.digits * BigInt(10) ** BigInt(places - d.places) })), scale: BigInt(10) ** BigInt(places) };
}
function allocate(items: Weight[], total: number): Map<string, number> {
  validateTotal(total);
  unique(items.map(i => i.userId));
  if (total === 0) return new Map(items.map(i => [i.userId, 0]));
  const denominator = items.reduce((sum, i) => sum + i.weight, BigInt(0));
  if (denominator <= BigInt(0)) throw new Error("Total weights must be greater than zero");
  const rows = items.map(i => ({ userId: i.userId, amount: BigInt(total) * i.weight / denominator, remainder: BigInt(total) * i.weight % denominator }));
  let left = BigInt(total) - rows.reduce((sum, r) => sum + r.amount, BigInt(0));
  rows.sort((a, b) => a.remainder === b.remainder ? a.userId.localeCompare(b.userId) : a.remainder > b.remainder ? -1 : 1);
  return new Map(rows.map(row => [row.userId, Number(row.amount + (left-- > BigInt(0) ? BigInt(1) : BigInt(0)))]));
}
export function largestRemainder(items: WeightedItem[], total: number): Map<string, number> {
  return allocate(decimalWeights(items).items, total);
}
export function splitEqual(userIds: string[], total: number): Map<string, number> {
  validateTotal(total);
  if (userIds.length === 0) return new Map();
  return allocate(userIds.map(userId => ({ userId, weight: BigInt(1) })), total);
}
export function splitExact(participants: Array<{ userId: string; owed: number }>, total: number): Map<string, number> {
  validateTotal(total);
  unique(participants.map(p => p.userId));
  participants.forEach(p => validateTotal(p.owed));
  const sum = participants.reduce((s, p) => s + p.owed, 0);
  if (sum !== total) throw new Error("Exact splits sum to " + sum + " but expense total is " + total);
  return new Map(participants.map(p => [p.userId, p.owed]));
}
export function splitPercentage(participants: Array<{ userId: string; percentage: number }>, total: number): Map<string, number> {
  const { items, scale } = decimalWeights(participants.map(p => ({ userId: p.userId, exact: p.percentage })));
  if (items.reduce((sum, i) => sum + i.weight, BigInt(0)) !== BigInt(100) * scale) {
    throw new Error("Percentages sum to " + participants.reduce((s, p) => s + p.percentage, 0) + ", expected 100");
  }
  return allocate(items, total);
}
export function splitShares(participants: Array<{ userId: string; shares: number }>, total: number): Map<string, number> {
  participants.forEach(p => validateTotal(p.shares));
  return allocate(participants.map(p => ({ userId: p.userId, weight: BigInt(p.shares) })), total);
}
export function computeLedgerEdges(participants: Participant[]): LedgerEdge[] {
  unique(participants.map(p => p.userId));
  participants.forEach(p => { validateTotal(p.paid); validateTotal(p.owed); });
  if (participants.reduce((s, p) => s + p.paid - p.owed, 0) !== 0) throw new Error("Expense is unbalanced");
  const creditors = participants.filter(p => p.paid > p.owed).map(p => ({ userId: p.userId, remaining: p.paid - p.owed }));
  const debtors = participants.filter(p => p.owed > p.paid).map(p => ({ userId: p.userId, remaining: p.owed - p.paid }));
  const compare = (a: { remaining: number; userId: string }, b: { remaining: number; userId: string }) => b.remaining - a.remaining || a.userId.localeCompare(b.userId);
  const edges: LedgerEdge[] = [];
  while (true) {
    creditors.sort(compare); debtors.sort(compare);
    const creditor = creditors[0]; const debtor = debtors[0];
    if (!creditor || !debtor || creditor.remaining === 0 || debtor.remaining === 0) break;
    const amount = Math.min(creditor.remaining, debtor.remaining);
    edges.push({ debtorId: debtor.userId, creditorId: creditor.userId, amount });
    creditor.remaining -= amount; debtor.remaining -= amount;
  }
  return edges;
}
