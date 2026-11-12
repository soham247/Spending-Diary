import { Money } from "@/components/money/Money";
import { friendBalances } from "@/lib/domain/friend-balances";

export function FriendBalance({
  balances,
  variant = "compact",
}: {
  balances: readonly { currency: string; net: number }[];
  variant?: "compact" | "summary";
}) {
  const outstanding = friendBalances(balances).filter(
    (balance) => balance.net !== 0,
  );
  return outstanding.length ? (
    <div className="space-y-2">
      {outstanding.map((balance) => (
        <p key={balance.currency} className="space-y-1">
          <span
            className={
              variant === "summary"
                ? "block text-sm text-muted-foreground"
                : "block text-xs text-muted-foreground"
            }
          >
            {balance.net < 0 ? "You owe" : "Owes you"}
          </span>
          <Money
            amount={Math.abs(balance.net)}
            currency={balance.currency}
            tone={balance.net < 0 ? "debit" : "credit"}
            className={
              variant === "summary" ? "text-3xl font-medium" : "font-medium"
            }
          />
        </p>
      ))}
    </div>
  ) : (
    <span className="text-sm text-muted-foreground">Settled up</span>
  );
}
