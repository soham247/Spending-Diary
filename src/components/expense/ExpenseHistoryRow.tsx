import Link from "next/link";
import { format, parseISO } from "date-fns";
import type { ExpensePage } from "@/lib/api/expenses";
import { Money } from "@/components/money/Money";
import { Button } from "@/components/ui/button";

export function ExpenseHistoryRow({
  expense,
  returnTo,
  onRestore,
  restoring,
}: {
  returnTo: string;
  expense: Pick<
    ExpensePage["items"][number],
    "id" | "description" | "date" | "kind" | "amount" | "yourShare"
  > & { category: string; currency: string };
  onRestore?: (id: string) => void;
  restoring: boolean;
}) {
  const content = (
    <>
      <div className="min-w-0 space-y-1">
        <p className="line-clamp-2 break-words font-medium">
          {expense.description}
        </p>
        <p className="text-xs text-muted-foreground sm:text-sm">
          {format(parseISO(expense.date), "d MMM")} · {expense.category} ·{" "}
          {expense.kind === "PERSONAL" ? "Personal" : "Shared"}
        </p>
      </div>
      <div className="shrink-0 space-y-1 text-right">
        <p className="font-medium">
          {expense.yourShare ? (
            <Money amount={expense.yourShare} currency={expense.currency} />
          ) : (
            <span className="text-sm text-muted-foreground">No share</span>
          )}
        </p>
        {expense.kind === "SHARED" && (
          <p className="text-xs text-muted-foreground">
            Bill <Money amount={expense.amount} currency={expense.currency} />
          </p>
        )}
      </div>
    </>
  );
  const rowClass = "flex min-h-20 items-center justify-between gap-4 p-4";
  return onRestore ? (
    <div>
      <div className={rowClass}>{content}</div>
      <div className="px-4 pb-4">
        <Button
          variant="outline"
          disabled={restoring}
          onClick={() => onRestore(expense.id)}
        >
          Restore<span className="sr-only"> {expense.description}</span>
        </Button>
      </div>
    </div>
  ) : (
    <Link
      href={
        "/expenses/" + expense.id + "?returnTo=" + encodeURIComponent(returnTo)
      }
      className={
        rowClass +
        " transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      }
    >
      {content}
    </Link>
  );
}
