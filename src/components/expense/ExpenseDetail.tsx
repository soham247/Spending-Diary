"use client";
import { ExpenseDrawer } from "@/components/expense/ExpenseDrawer";
import Link from "next/link";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useExpense,
  useDeleteExpense,
  useRestoreExpense,
} from "@/hooks/use-expenses";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/money/Money";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { ApiError } from "@/lib/api/client";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageLayout } from "@/components/shell/PageLayout";

export function ExpenseDetail({ id }: { id: string }) {
  const expense = useExpense(id);
  const remove = useDeleteExpense();
  const restore = useRestoreExpense();
  const router = useRouter();
  async function deleteRow() {
    try {
      await remove.mutateAsync(id);
      router.push("/expenses");
      toast("Expense deleted", {
        duration: 6000,
        action: {
          label: "Undo",
          onClick: () => {
            void restore
              .mutateAsync(id)
              .then(() => toast.success("Expense restored"))
              .catch(() =>
                toast.error(
                  "Couldn't restore. Open Deleted expenses to try again.",
                ),
              );
          },
        },
      });
    } catch {
      toast.error("Couldn't delete. Check your connection and try again.");
    }
  }
  if (expense.isPending)
    return (
      <PageLayout header={<PageHeader title="Expense" />}>
        <LoadingState />
      </PageLayout>
    );
  if (expense.isError)
    return (
      <PageLayout header={<PageHeader title="Expense" />}>
        <ErrorState
          message={
            expense.error instanceof ApiError &&
            [403, 404].includes(expense.error.status)
              ? "This page isn't available. It may have been deleted, or you may not have access."
              : undefined
          }
          retry={() => void expense.refetch()}
        />
      </PageLayout>
    );
  const row = expense.data;
  return (
    <PageLayout
      header={<PageHeader title={row.description} description={row.category} />}
    >
      <p className="text-3xl">
        <Money amount={row.amount} currency={row.currency} />
      </p>
      <p className="text-muted-foreground">{row.date}</p>
      <p>{row.kind === "PERSONAL" ? "Just for you" : "Shared expense"}</p>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Paid by</h2>
        {row.participants
          .filter((person) => person.paid > 0)
          .map((person) => (
            <div className="flex justify-between gap-3" key={person.userId}>
              <span>{person.name}</span>
              <Money amount={person.paid} currency={row.currency} />
            </div>
          ))}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Split</h2>
        {row.participants.map((person) => (
          <div className="flex justify-between gap-3" key={person.userId}>
            <span>{person.name}</span>
            <Money amount={person.owed} currency={row.currency} />
          </div>
        ))}
      </section>
      {row.notes && <p className="whitespace-pre-wrap">{row.notes}</p>}
      <div className="flex gap-3">
        {row.canEdit && (
          <ExpenseDrawer expenseId={id} trigger={<Button>Edit</Button>} />
        )}
        <Button
          variant="outline"
          disabled={!row.canEdit || remove.isPending}
          onClick={() => void deleteRow()}
        >
          {remove.isPending ? "Deleting…" : "Delete"}
        </Button>
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">History</h2>
        <ActivityFeed expenseId={id} />
      </section>
      <Button asChild variant="ghost">
        <Link href="/expenses">Back to expenses</Link>
      </Button>
    </PageLayout>
  );
}
