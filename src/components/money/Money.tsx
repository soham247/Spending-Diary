import { formatMoney } from "@/lib/money/format-money";
import { cn } from "@/lib/utils";

export function Money({ amount, currency = "INR", tone = "neutral", className }: {
  amount: number; currency?: string; tone?: "neutral" | "credit" | "debit"; className?: string;
}) {
  return <span className={cn("tabular-nums whitespace-nowrap", tone === "credit" && "text-credit", tone === "debit" && "text-debit", className)}>{formatMoney(amount, currency)}</span>;
}
