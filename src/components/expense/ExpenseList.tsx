"use client";

import { BackButton } from "@/components/common/BackButton";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  MoreHorizontal,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ExpenseDrawer } from "@/components/expense/ExpenseDrawer";
import {
  ExpenseHistoryFilters,
  type HistoryFilters,
} from "@/components/expense/ExpenseHistoryFilters";
import { ExpenseHistoryRow } from "@/components/expense/ExpenseHistoryRow";
import { PageHeaderAction } from "@/components/shell/PageHeaderAction";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageLayout } from "@/components/shell/PageLayout";
import {
  useExpenses,
  useRestoreExpense,
  useExpenseHistoryScroll,
} from "@/hooks/use-expenses";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/money/Money";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { expenseListSchema } from "@/lib/validation/expense";
import type { ExpensePage } from "@/lib/api/expenses";
import { monthLabel } from "@/lib/utils/expense-month";

export function ExpenseList({
  groupId,
  friendId,
}: {
  groupId?: string;
  friendId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const deleted = params.get("deleted") === "true";
  const kind = params.get("kind") ?? "both";
  const filters: HistoryFilters = {
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    includeOthers: params.get("scope") === "all",
  };
  function update(values: Record<string, string | undefined>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(pathname + (next.size ? "?" + next : ""), { scroll: false });
  }
  const input = {
    groupId,
    friendId,
    history: "true" as const,
    month: params.get("month") ?? "latest",
    scope:
      filters.includeOthers || deleted ? ("all" as const) : ("mine" as const),
    deleted: deleted ? ("true" as const) : ("false" as const),
    kind: kind === "both" ? undefined : kind,
    from: filters.from || undefined,
    to: filters.to || undefined,
  };
  const validation = expenseListSchema.safeParse(input);
  const expenses = useExpenses(
    validation.success ? validation.data : {},
    validation.success,
  );
  useExpenseHistoryScroll(
    pathname + "?" + params.toString(),
    expenses.isSuccess,
  );
  const first = expenses.data?.pages[0];
  const nextPageError = expenses.isFetchNextPageError;
  const fetchNextPage = expenses.fetchNextPage;
  const selectedMonth = params.get("month") ?? "latest";
  const months = [
    ...new Set([
      ...(first?.availableMonths ?? []),
      ...(/^\d{4}-(0[1-9]|1[0-2])$/.test(selectedMonth) ? [selectedMonth] : []),
    ]),
  ]
    .sort()
    .reverse();
  const grouped = new Map<string, ExpensePage["items"]>();
  for (const expense of expenses.data?.pages.flatMap((page) => page.items) ??
    []) {
    const month = expense.date.slice(0, 7);
    const rows = grouped.get(month) ?? [];
    rows.push(expense);
    grouped.set(month, rows);
  }
  const restore = useRestoreExpense();
  async function undo(id: string) {
    try {
      await restore.mutateAsync(id);
      toast.success("Expense restored");
    } catch {
      toast.error("Couldn't restore. Check your connection and try again.");
    }
  }
  const activeFilters =
    Number(Boolean(filters.from || filters.to)) + Number(filters.includeOthers);
  return (
    <PageLayout
      header={
        <PageHeader
          back={
            deleted ? (
              <BackButton
                label="Back to expenses"
                onClick={() =>
                  update({
                    deleted: undefined,
                    month: undefined,
                    from: undefined,
                    to: undefined,
                  })
                }
              />
            ) : undefined
          }
          title={deleted ? "Deleted expenses" : "Expenses"}
          actions={
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="History options"
                  >
                    <MoreHorizontal className="size-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() =>
                      update({
                        deleted: deleted ? undefined : "true",
                        month: undefined,
                        from: undefined,
                        to: undefined,
                      })
                    }
                  >
                    {deleted ? (
                      <>
                        <ArrowLeft aria-hidden="true" /> Back to expenses
                      </>
                    ) : (
                      "Deleted expenses"
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ExpenseDrawer
                groupId={groupId}
                friendId={friendId}
                trigger={<PageHeaderAction label="Add expense" />}
              />
            </>
          }
        />
      }
      toolbar={
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Select
              value={filters.from || filters.to ? "custom" : selectedMonth}
              onValueChange={(month) =>
                update({
                  month: month === "latest" ? undefined : month,
                  from: undefined,
                  to: undefined,
                })
              }
            >
              <SelectTrigger
                aria-label="Month"
                className="min-w-0 flex-1 sm:w-52 sm:flex-none"
              >
                <SelectValue>
                  {filters.from || filters.to
                    ? "Custom dates"
                    : selectedMonth === "latest"
                      ? first?.selectedMonth
                        ? monthLabel(first.selectedMonth)
                        : "Latest month"
                      : selectedMonth === "all"
                        ? "All months"
                        : months.includes(selectedMonth)
                          ? monthLabel(selectedMonth)
                          : "Choose month"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">
                  Latest month
                  {first?.availableMonths?.[0]
                    ? " · " + monthLabel(first.availableMonths[0])
                    : ""}
                </SelectItem>
                <SelectItem value="all">All months</SelectItem>
                {(filters.from || filters.to) && (
                  <SelectItem value="custom">Custom dates</SelectItem>
                )}
                {months.map((month) => (
                  <SelectItem key={month} value={month}>
                    {monthLabel(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setFiltersOpen(true)}
              aria-label={
                activeFilters ? `Filters, ${activeFilters} active` : "Filters"
              }
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Filters
              {activeFilters > 0 && (
                <span className="tabular-nums">{activeFilters}</span>
              )}
            </Button>
          </div>
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Expense type"
          >
            {(
              [
                ["both", "Both"],
                ["PERSONAL", "Personal"],
                ["SHARED", "Shared"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                variant={kind === value ? "secondary" : "ghost"}
                aria-pressed={kind === value}
                onClick={() =>
                  update({ kind: value === "both" ? undefined : value })
                }
              >
                {label}
              </Button>
            ))}
            {activeFilters > 0 && (
              <Button
                variant="ghost"
                onClick={() =>
                  update({ from: undefined, to: undefined, scope: undefined })
                }
              >
                <X className="size-4" aria-hidden="true" />
                Clear filters
              </Button>
            )}
          </div>
          {(filters.from || filters.to) && (
            <p className="text-sm text-muted-foreground">
              {filters.from || "Beginning"} to {filters.to || "Latest"}
            </p>
          )}
        </div>
      }
    >
      {!validation.success ? (
        <ErrorState
          message="Choose valid filters and dates"
          retry={() =>
            update({
              month: undefined,
              kind: undefined,
              from: undefined,
              to: undefined,
            })
          }
        />
      ) : expenses.isPending ? (
        <LoadingState />
      ) : expenses.isError && !expenses.data ? (
        <ErrorState retry={() => void expenses.refetch()} />
      ) : (
        <>
          {grouped.size === 0 ? (
            <EmptyState
              action={
                <Button
                  variant="outline"
                  onClick={() =>
                    update({
                      month: undefined,
                      kind: undefined,
                      from: undefined,
                      to: undefined,
                      scope: undefined,
                    })
                  }
                >
                  Reset filters
                </Button>
              }
            >
              {deleted
                ? "No deleted expenses"
                : "No expenses match these filters"}
            </EmptyState>
          ) : (
            [...grouped].map(([month, rows]) => {
              const totals =
                first?.monthlySpending?.find((item) => item.month === month)
                  ?.totals ?? [];
              return (
                <section
                  key={month}
                  aria-label={monthLabel(month)}
                  className="space-y-3"
                >
                  {deleted ? (
                    <h2 className="flex min-h-11 items-center text-lg font-medium">
                      {monthLabel(month)}
                    </h2>
                  ) : (
                    <Link
                      href={`/insights?month=${month}`}
                      aria-label={`View insights for ${monthLabel(month)}`}
                      title={`View insights for ${monthLabel(month)}`}
                      className="flex min-h-11 items-center justify-between gap-4 rounded-md py-2 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <h2 className="min-w-0 text-lg font-medium">
                        {monthLabel(month)}
                      </h2>
                      <div className="flex shrink-0 items-center gap-2">
                        <div
                          className="text-right font-medium"
                          aria-label="Monthly spending"
                        >
                          {totals.map((total) => (
                            <p key={total.currency}>
                              <Money
                                amount={total.amount}
                                currency={total.currency}
                              />
                            </p>
                          ))}
                        </div>
                        <ArrowUpRight
                          className="size-4 text-muted-foreground"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                      </div>
                    </Link>
                  )}
                  <Card className="gap-0 divide-y divide-border overflow-hidden py-0">
                    {rows.map((expense) => (
                      <ExpenseHistoryRow
                        key={expense.id}
                        expense={expense}
                        returnTo={pathname + "?" + params.toString()}
                        onRestore={deleted ? (id) => void undo(id) : undefined}
                        restoring={restore.isPending}
                      />
                    ))}
                  </Card>
                </section>
              );
            })
          )}
          {expenses.hasNextPage && (
            <Button
              variant="outline"
              disabled={expenses.isFetchingNextPage}
              onClick={() => void expenses.fetchNextPage()}
            >
              {expenses.isFetchingNextPage ? "Loading…" : "Load more expenses"}
            </Button>
          )}
          {nextPageError && <ErrorState retry={() => void fetchNextPage()} />}
          {!deleted && (
            <p className="text-xs text-muted-foreground">
              Spending counts your share, whoever paid. Payments to friends are
              excluded.
            </p>
          )}
        </>
      )}
      {filtersOpen && (
        <ExpenseHistoryFilters
          value={filters}
          onClose={() => setFiltersOpen(false)}
          onApply={(value) => {
            update({
              from: value.from || undefined,
              to: value.to || undefined,
              scope: value.includeOthers ? "all" : undefined,
            });
            setFiltersOpen(false);
          }}
        />
      )}
    </PageLayout>
  );
}
