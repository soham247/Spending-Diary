"use client";
import { ExpenseDrawer } from "@/components/expense/ExpenseDrawer";
import { BackButton } from "@/components/common/BackButton";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { MoreHorizontal, Pencil } from "lucide-react";
import { ExpenseHistory } from "@/components/expense/ExpenseHistory";
import { useProfile } from "@/hooks/use-profile";
import { useGroup } from "@/hooks/use-groups";
import {
  expenseDetailSummary,
  splitWeightLabel,
} from "@/lib/domain/expense-detail";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
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
import { ApiError } from "@/lib/api/client";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageLayout } from "@/components/shell/PageLayout";

export function ExpenseDetail({
  id,
  returnTo,
}: {
  id: string;
  returnTo: string;
}) {
  const back = (
    <BackButton
      href={returnTo}
      label={
        returnTo.startsWith("/friends/") ? "Back to friend" : "Back to expenses"
      }
    />
  );
  const expense = useExpense(id);
  const profile = useProfile();
  const group = useGroup(expense.data?.groupId ?? "");
  const remove = useDeleteExpense();
  const restore = useRestoreExpense();
  const router = useRouter();
  async function deleteRow() {
    try {
      await remove.mutateAsync(id);
      router.push(returnTo);
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
      <PageLayout header={<PageHeader title="Expense" back={back} />}>
        <div
          role="status"
          aria-label="Loading expense"
          className="mx-auto max-w-3xl space-y-6"
        >
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-24 w-full" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-16 w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </PageLayout>
    );
  if (!expense.data)
    return (
      <PageLayout header={<PageHeader title="Expense" back={back} />}>
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
  const summary = expenseDetailSummary(row, profile.data?.id ?? "");
  const names = new Map([
    ...(group.data?.members.map(
      (person) => [person.id, person.name] as const,
    ) ?? []),
    ...row.participants.map((person) => [person.userId, person.name] as const),
    ...(profile.data ? [[profile.data.id, "You"] as const] : []),
  ]);
  const creator = names.get(row.createdById);
  return (
    <PageLayout
      header={
        <PageHeader
          title={row.description}
          description={row.category}
          back={back}
          actions={
            row.canEdit && (
              <>
                <ExpenseDrawer
                  expenseId={id}
                  trigger={
                    <Button
                      size="icon"
                      aria-label="Edit"
                      className="max-md:min-h-11 max-md:min-w-11"
                      disabled={remove.isPending}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                  }
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Expense actions"
                      className="max-md:min-h-11 max-md:min-w-11"
                      disabled={remove.isPending}
                    >
                      <MoreHorizontal aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => void deleteRow()}
                    >
                      Delete expense
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )
          }
        />
      }
      contentClassName="mx-auto max-w-3xl space-y-6"
    >
      <section aria-label="Expense summary" className="space-y-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <time dateTime={row.date}>
            {format(parseISO(row.date), "d MMM yyyy")}
          </time>
          {row.groupId ? (
            group.data ? (
              <Button asChild variant="link">
                <Link
                  href={"/groups/" + row.groupId}
                  className="max-w-full whitespace-normal break-words"
                >
                  {group.data.name}
                </Link>
              </Button>
            ) : (
              <span>Group expense</span>
            )
          ) : (
            <span>
              {row.kind === "PERSONAL" ? "Just for you" : "Direct expense"}
            </span>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {row.kind === "PERSONAL" ? "Amount" : "Bill total"}
          </p>
          <p className="text-3xl font-semibold">
            <Money amount={row.amount} currency={row.currency} />
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {creator
            ? `Added by ${creator === "You" ? "you" : creator} on `
            : "Added on "}
          <time dateTime={row.createdAt}>
            {format(parseISO(row.createdAt), "d MMM yyyy")}
          </time>
        </p>
        {!row.canEdit && (
          <p className="text-sm text-muted-foreground">
            This expense is read-only.
          </p>
        )}
        {row.kind === "SHARED" && (
          <div className="border-t border-dashed border-border pt-4">
            {profile.isPending ? (
              <div role="status" aria-label="Loading your share">
                <Skeleton className="h-16 w-full" />
              </div>
            ) : !profile.data ? (
              <ErrorState
                message="Couldn't load your share. Try again."
                retry={() => void profile.refetch()}
              />
            ) : (
              <dl className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <dt className="text-sm text-muted-foreground">Your share</dt>
                  <dd className="text-xl font-medium">
                    {summary.viewer?.owed ? (
                      <Money
                        amount={summary.viewer.owed}
                        currency={row.currency}
                      />
                    ) : (
                      <span className="text-base">No share</span>
                    )}
                  </dd>
                </div>
                <div className="space-y-1 text-right">
                  <dt className="text-sm text-muted-foreground">You paid</dt>
                  <dd className="text-xl font-medium">
                    <Money
                      amount={summary.viewer?.paid ?? 0}
                      currency={row.currency}
                    />
                  </dd>
                </div>
              </dl>
            )}
          </div>
        )}
      </section>
      {row.kind === "SHARED" && (
        <>
          <section className="space-y-3">
            <h2 className="text-base font-medium">Paid by</h2>
            <Card className="gap-0 divide-y divide-border py-0">
              {summary.payers.map((person) => (
                <div
                  className="flex items-center justify-between gap-4 p-4"
                  key={person.userId}
                >
                  <span className="min-w-0 break-words">
                    {names.get(person.userId)}
                  </span>
                  <Money amount={person.paid} currency={row.currency} />
                </div>
              ))}
            </Card>
          </section>
          <section className="space-y-3">
            <h2 className="text-base font-medium">{summary.splitLabel}</h2>
            <Card className="gap-0 divide-y divide-border py-0">
              {summary.split.map((person) => (
                <div
                  className="flex items-center justify-between gap-4 p-4"
                  key={person.userId}
                >
                  <span className="min-w-0 space-y-1 break-words">
                    <span className="block">{names.get(person.userId)}</span>
                    {splitWeightLabel(row.splitType, person.splitInput) && (
                      <span className="block text-sm text-muted-foreground">
                        {splitWeightLabel(row.splitType, person.splitInput)}
                      </span>
                    )}
                  </span>
                  <Money amount={person.owed} currency={row.currency} />
                </div>
              ))}
            </Card>
          </section>
        </>
      )}
      {row.notes && (
        <section className="space-y-3">
          <h2 className="text-base font-medium">Notes</h2>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {row.notes}
          </p>
        </section>
      )}
      <section className="space-y-3">
        <h2 className="text-base font-medium">History</h2>
        <ExpenseHistory key={id} expenseId={id} names={names} />
      </section>
    </PageLayout>
  );
}
