import { toSafeNumber } from "@/lib/utils/to-safe-number";

export function friendBalances(
  balances: readonly { currency: string; net: number }[],
) {
  const totals = new Map<string, bigint>();
  for (const balance of balances) {
    totals.set(
      balance.currency,
      (totals.get(balance.currency) ?? BigInt(0)) + BigInt(balance.net),
    );
  }
  return [...totals]
    .map(([currency, net]) => ({ currency, net: toSafeNumber(net) }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}
