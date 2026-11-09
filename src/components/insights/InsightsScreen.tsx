"use client";
import { useState } from "react";
import { useInsights } from "@/hooks/use-insights";
import { todayDate } from "@/lib/validation/personal-expense";
import { Money } from "@/components/money/Money";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { SpendingChart } from "./SpendingChart";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageLayout } from "@/components/shell/PageLayout";
export function InsightsScreen() {
  const [month, setMonth] = useState(() => todayDate().slice(0, 7));
  const [filter, setFilter] = useState("BOTH");
  const query = useInsights(
    month,
    filter === "PERSONAL" || filter === "SHARED" ? filter : undefined,
  );
  return (
    <PageLayout header={<PageHeader title="Your spending" />}>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="month">Month</Label>
          <Input
            id="month"
            type="month"
            value={month}
            onChange={(e) => {
              if (e.target.value) setMonth(e.target.value);
            }}
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40" aria-label="Spending type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BOTH">Both</SelectItem>
            <SelectItem value="SHARED">Shared</SelectItem>
            <SelectItem value="PERSONAL">Personal</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState retry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState>No spending recorded for this month.</EmptyState>
      ) : (
        query.data.map((row) => (
          <section className="space-y-4" key={row.currency}>
            <p className="text-3xl font-semibold">
              You spent <Money amount={row.total} currency={row.currency} />
            </p>
            <p className="text-muted-foreground">
              Previous month:{" "}
              <Money amount={row.previousTotal} currency={row.currency} />
            </p>
            <SpendingChart categories={row.categories} />
            <Card className="gap-0 py-0 divide-y divide-border">
              {row.categories.map((category) => (
                <div
                  className="flex justify-between gap-3 p-4"
                  key={category.category}
                >
                  <span>{category.category}</span>
                  <Money amount={category.amount} currency={row.currency} />
                </div>
              ))}
            </Card>
          </section>
        ))
      )}
      <p className="text-sm text-muted-foreground">
        Your share of shared expenses plus your personal expenses. Payments to
        friends do not count as spending.
      </p>
    </PageLayout>
  );
}
