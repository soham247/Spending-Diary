import { toSafeNumber } from "@/lib/utils/to-safe-number";
import type { BalanceRow } from "@/lib/api/balances";
export function balanceSummary(viewerId: string, rows: BalanceRow[]) {
  const totals = new Map<string,bigint>();
  const groups = new Map<string,{ scopeId: string; currency: string; net: bigint }>();
  const people = new Map<string,{ userId: string; currency: string; net: bigint }>();
  for (const row of rows) {
    const net = row.userLowId === viewerId ? -BigInt(row.amount) : BigInt(row.amount);
    totals.set(row.currency,(totals.get(row.currency) ?? BigInt(0))+net);
    const userId = row.userLowId === viewerId ? row.userHighId : row.userLowId;
    const personKey = userId+"\0"+row.currency;
    const person = people.get(personKey) ?? { userId, currency: row.currency, net: BigInt(0) };
    person.net += net; people.set(personKey,person);
    if (row.scopeId !== "direct") {
      const key = row.scopeId+"\0"+row.currency;
      const group = groups.get(key) ?? { scopeId: row.scopeId, currency: row.currency, net: BigInt(0) };
      group.net += net; groups.set(key,group);
    }
  }
  return { totals: [...totals].map(([currency,net]) => ({ currency, net: toSafeNumber(net) })), groups: [...groups.values()].map(row => ({ ...row, net: toSafeNumber(row.net) })), people: [...people.values()].map(row => ({ ...row, net: toSafeNumber(row.net) })) };
}
