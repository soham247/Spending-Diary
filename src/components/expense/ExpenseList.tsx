"use client";
import { ExpenseDrawer } from "@/components/expense/ExpenseDrawer";
import Link from "next/link";
import { PageLayout } from "@/components/shell/PageLayout";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageHeaderAction } from "@/components/shell/PageHeaderAction";
import { useState } from "react";
import { toast } from "sonner";
import { useExpenses, useRestoreExpense } from "@/hooks/use-expenses";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/money/Money";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  expenseListSchema,
  type ExpenseListInput,
} from "@/lib/validation/expense";
import { monthToDate } from "@/lib/utils/month-to-date";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ExpenseList({
  groupId,
  friendId,
}: {
  groupId?: string;
  friendId?: string;
}) {
  const [deleted, setDeleted] = useState(false);
  const [scope, setScope] = useState<"mine" | "all">(
    groupId || friendId ? "all" : "mine",
  );
  const [range, setRange] = useState(monthToDate);
  const [kind, setKind] = useState<ExpenseListInput["kind"]>();
  const mine = scope === "mine" && !deleted;
  const view = deleted ? "deleted" : mine ? "mine" : "all";
  const input = {
    groupId,
    friendId,
    deleted: deleted ? ("true" as const) : ("false" as const),
    scope: mine ? ("mine" as const) : ("all" as const),
    ...(mine ? { ...range, kind } : {}),
  };
  const validation = expenseListSchema.safeParse(input);
  const expenses = useExpenses(input, validation.success);
  const currentMonth = monthToDate();
  const isThisMonth =
    range.from === currentMonth.from && range.to === currentMonth.to;
  const restore = useRestoreExpense();
  async function undo(id: string) {
    try {
      await restore.mutateAsync(id);
      toast.success("Expense restored");
    } catch {
      toast.error("Couldn't restore. Check your connection and try again.");
    }
  }
  return (
    <PageLayout
      header={
        <PageHeader
          title={deleted ? "Deleted expenses" : "Expenses"}
          actions={
            <ExpenseDrawer trigger={<PageHeaderAction label="Add expense" />} />
          }
        />
      }
    >
      <Tabs
        value={view}
        onValueChange={(value) => {
          setDeleted(value === "deleted");
          if (value !== "deleted") setScope(value === "mine" ? "mine" : "all");
        }}
        className="gap-6"
      >
        {mine && validation.success && expenses.isSuccess && (
          <Card role="region" aria-label="Your spending total">
            <CardHeader>
              <CardTitle>
                <h2>
                  {isThisMonth
                    ? "You spent this month"
                    : "You spent in this period"}
                </h2>
              </CardTitle>
              <CardDescription>
                {range.from} to {range.to}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expenses.data.pages[0]?.spendingTotals?.length ? (
                expenses.data.pages[0].spendingTotals.map((total) => (
                  <p key={total.currency} className="text-3xl font-semibold">
                    <Money amount={total.amount} currency={total.currency} />
                  </p>
                ))
              ) : (
                <p className="text-3xl font-semibold">
                  <Money amount={0} />
                </p>
              )}
            </CardContent>
          </Card>
        )}
        <TabsList
          aria-label="Expense view"
          className="max-w-full justify-start overflow-x-auto *:shrink-0"
        >
          <TabsTrigger value="mine">My spending</TabsTrigger>
          <TabsTrigger value="all">All expenses</TabsTrigger>
          <TabsTrigger value="deleted">Deleted expenses</TabsTrigger>
        </TabsList>
        <TabsContent key={view} value={view} className="space-y-6">
          {mine && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap">
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="spending-from">From</Label>
                  <Input
                    id="spending-from"
                    type="date"
                    value={range.from}
                    onChange={(event) =>
                      setRange((value) => ({
                        ...value,
                        from: event.target.value,
                      }))
                    }
                    aria-invalid={!validation.success}
                    aria-describedby={
                      !validation.success ? "spending-date-error" : undefined
                    }
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="spending-to">To</Label>
                  <Input
                    id="spending-to"
                    type="date"
                    value={range.to}
                    onChange={(event) =>
                      setRange((value) => ({
                        ...value,
                        to: event.target.value,
                      }))
                    }
                    aria-invalid={!validation.success}
                    aria-describedby={
                      !validation.success ? "spending-date-error" : undefined
                    }
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="spending-kind">Expenses</Label>
                  <Select
                    value={kind ?? "both"}
                    onValueChange={(value) =>
                      setKind(
                        value === "PERSONAL" || value === "SHARED"
                          ? value
                          : undefined,
                      )
                    }
                  >
                    <SelectTrigger id="spending-kind" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Personal + shared</SelectItem>
                      <SelectItem value="PERSONAL">Personal only</SelectItem>
                      <SelectItem value="SHARED">Shared only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setRange(monthToDate())}
                >
                  This month
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Your share of shared expenses plus your personal expenses.
                Payments to friends don&apos;t count as spending.
              </p>
            </div>
          )}
          {!validation.success ? (
            <p
              id="spending-date-error"
              role="alert"
              className="text-sm text-destructive"
            >
              Choose valid dates with the end on or after the start.
            </p>
          ) : expenses.isPending ? (
            <LoadingState />
          ) : expenses.isError ? (
            <ErrorState retry={() => void expenses.refetch()} />
          ) : (
            <>
              {expenses.data.pages[0]?.items.length === 0 ? (
                <EmptyState>
                  {deleted
                    ? "No deleted expenses."
                    : mine
                      ? "No spending in this date range. Try different dates or add an expense."
                      : "Record an expense to start your spending diary."}
                </EmptyState>
              ) : (
                <Card className="gap-0 py-0 divide-y divide-border">
                  {expenses.data.pages
                    .flatMap((page) => page.items)
                    .map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between gap-3 p-4"
                      >
                        <div className="min-w-0">
                          {deleted ? (
                            <p className="font-medium">{expense.description}</p>
                          ) : (
                            <Link
                              className="font-medium underline-offset-4 hover:underline"
                              href={"/expenses/" + expense.id}
                            >
                              {expense.description}
                            </Link>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {expense.date} , {expense.category}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-3">
                          <div className="text-right">
                            <Money
                              amount={
                                mine ? (expense.yourShare ?? 0) : expense.amount
                              }
                              currency={expense.currency}
                            />
                            {mine && (
                              <p className="text-xs text-muted-foreground">
                                Your share · Total{" "}
                                <Money
                                  amount={expense.amount}
                                  currency={expense.currency}
                                />
                              </p>
                            )}
                          </div>
                          {deleted && (
                            <Button
                              variant="outline"
                              disabled={restore.isPending}
                              onClick={() => void undo(expense.id)}
                            >
                              Restore
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                </Card>
              )}
              {expenses.hasNextPage && (
                <Button
                  variant="outline"
                  disabled={expenses.isFetchingNextPage}
                  onClick={() => void expenses.fetchNextPage()}
                >
                  {expenses.isFetchingNextPage ? "Loading…" : "Load more"}
                </Button>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
