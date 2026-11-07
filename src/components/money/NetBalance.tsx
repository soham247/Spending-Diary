import { Money } from "./Money";

export function NetBalance({
  balances,
}: {
  balances: { currency: string; net: number }[];
}) {
  if (!balances.length)
    return <span className="text-sm text-muted-foreground">Settled up</span>;
  return (
    <span className="space-y-2 text-right">
      {balances.map((row) => (
        <span key={row.currency} className="block">
          <span className="block text-sm text-muted-foreground">
            {row.net > 0
              ? "Owed to you"
              : row.net < 0
                ? "You owe"
                : "Settled up"}
          </span>
          <Money
            amount={Math.abs(row.net)}
            currency={row.currency}
            tone={row.net > 0 ? "credit" : row.net < 0 ? "debit" : "neutral"}
          />
        </span>
      ))}
    </span>
  );
}
