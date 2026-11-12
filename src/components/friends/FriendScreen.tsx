"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ArrowUpRight, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/common/BackButton";
import { ExpenseDrawer } from "@/components/expense/ExpenseDrawer";
import { ExpenseHistoryRow } from "@/components/expense/ExpenseHistoryRow";
import { NicknameDrawer } from "./NicknameDrawer";
import { FriendBalance } from "./FriendBalance";
import { FriendsLoading } from "./FriendsLoading";
import { useFriend, useUpdateFriend } from "@/hooks/use-friends";
import { useGroups } from "@/hooks/use-groups";
import { useProfile } from "@/hooks/use-profile";
import {
  useDeleteSettlement,
  useRestoreSettlement,
} from "@/hooks/use-settlements";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/money/Money";
import { RecordPaymentSheet } from "@/components/settlement/RecordPaymentSheet";
import { SettleSheet } from "@/components/settlement/SettleSheet";
import { InvitePanel } from "@/components/invite/InvitePanel";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { PageHeaderAction } from "@/components/shell/PageHeaderAction";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageLayout } from "@/components/shell/PageLayout";

export function FriendScreen({
  id,
  returnTo = "/friends",
}: {
  id: string;
  returnTo?: string;
}) {
  const friend = useFriend(id);
  const profile = useProfile();
  const groups = useGroups();
  const update = useUpdateFriend();
  const remove = useDeleteSettlement();
  const restore = useRestoreSettlement();
  const back = <BackButton href={returnTo} label="Back to friends" />;
  if (friend.isPending || profile.isPending)
    return (
      <PageLayout
        header={<PageHeader title="Friend" back={back} />}
        contentClassName="mx-auto max-w-3xl"
      >
        <FriendsLoading />
      </PageLayout>
    );
  if (friend.isError || profile.isError || !friend.data || !profile.data)
    return (
      <PageLayout
        header={<PageHeader title="Friend" back={back} />}
        contentClassName="mx-auto max-w-3xl"
      >
        <ErrorState
          retry={() => {
            void friend.refetch();
            void profile.refetch();
          }}
        />
      </PageLayout>
    );
  const row = friend.data;
  const scopes = row.balances.filter((balance) => balance.net !== 0);
  const detailUrl =
    "/friends/" + id + "?returnTo=" + encodeURIComponent(returnTo);
  const groupNames = new Map(
    groups.data?.map((group) => [group.id, group.name]),
  );
  function scopeName(scopeId: string) {
    return scopeId === "direct"
      ? "Direct expenses"
      : (groupNames.get(scopeId) ?? "Group expenses");
  }
  async function block() {
    try {
      await update.mutateAsync({ id, input: { blocked: !row.blocked } });
      toast.success(row.blocked ? "Friend unblocked" : "Friend blocked", {
        action: {
          label: "Undo",
          onClick: () => {
            void update
              .mutateAsync({ id, input: { blocked: row.blocked } })
              .catch(() =>
                toast.error("Couldn't undo. Try again from friend actions."),
              );
          },
        },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't update friend",
      );
    }
  }
  async function deletePayment(paymentId: string) {
    try {
      await remove.mutateAsync(paymentId);
      toast("Payment deleted", {
        duration: 6000,
        action: {
          label: "Undo",
          onClick: () => {
            void restore
              .mutateAsync(paymentId)
              .then(() => toast.success("Payment restored"))
              .catch(() => toast.error("Couldn't restore payment"));
          },
        },
      });
    } catch {
      toast.error("Couldn't delete payment");
    }
  }
  return (
    <PageLayout
      header={
        <PageHeader
          back={back}
          title={row.name}
          actions={
            <>
              {!row.blocked && (
                <ExpenseDrawer
                  friendId={row.id}
                  trigger={<PageHeaderAction label="Add expense" />}
                />
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    aria-label="Friend actions"
                    disabled={update.isPending}
                  >
                    <MoreHorizontal aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => void block()}>
                    {row.blocked ? "Unblock friend" : "Block friend"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        />
      }
      contentClassName="mx-auto max-w-3xl space-y-6"
    >
      <section aria-label="Friend summary" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">
              {row.blocked
                ? "Blocked friend"
                : row.status === "INVITED"
                  ? "Tracked by name"
                  : "Friend"}
            </p>
          </div>
          <NicknameDrawer key={row.name} id={id} name={row.name} />
        </div>
        {row.blocked && (
          <p className="text-sm text-muted-foreground">
            New shared expenses are blocked. You can still view history and
            settle existing balances.
          </p>
        )}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-sm text-muted-foreground">Overall balance</h2>
            <FriendBalance balances={row.balances} variant="summary" />
          </div>
          <RecordPaymentSheet
            viewerId={profile.data.id}
            other={row}
            trigger={
              <Button variant="outline" className="min-h-11">
                Record payment
              </Button>
            }
          />
        </div>
      </section>
      {scopes.length > 0 && (
        <section aria-label="Balances by expense scope" className="space-y-3">
          <h2 className="text-base font-medium">Balance breakdown</h2>
          <p className="text-sm text-muted-foreground">
            Payments apply to the direct or group balance you choose
          </p>
          <Card className="gap-0 divide-y divide-border py-0">
            {scopes.map((balance) => (
              <div
                key={balance.scopeId + balance.currency}
                className="space-y-2 p-4"
              >
                <p className="text-sm text-muted-foreground">
                  {scopeName(balance.scopeId)} · {balance.currency}
                </p>
                <SettleSheet
                  viewerId={profile.data.id}
                  other={row}
                  net={balance.net}
                  scopeId={balance.scopeId}
                  currency={balance.currency}
                  presentation="row"
                />
              </div>
            ))}
          </Card>
        </section>
      )}
      {row.status === "INVITED" && (
        <InvitePanel input={{ type: "DIRECT", placeholderId: id }} />
      )}
      <Tabs defaultValue="expenses" className="gap-4">
        <TabsList aria-label="Shared history" className="min-h-12 w-full">
          <TabsTrigger value="expenses" className="min-h-11">
            Shared expenses
          </TabsTrigger>
          <TabsTrigger value="payments" className="min-h-11">
            Payments
          </TabsTrigger>
        </TabsList>
        <TabsContent value="expenses">
          <section aria-labelledby="friend-expenses" className="space-y-3">
            <div className="flex justify-end">
              <h2 id="friend-expenses" className="sr-only">
                Shared expenses
              </h2>
              <Button asChild variant="ghost" className="min-h-11">
                <Link href={"/expenses?friendId=" + id}>
                  View all shared expenses
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
            {row.expenses.length ? (
              <Card className="gap-0 overflow-hidden divide-y divide-border py-0">
                {row.expenses.map((expense) => (
                  <div key={expense.id}>
                    {expense.groupId && (
                      <p className="px-4 pt-3 text-xs text-muted-foreground">
                        {scopeName(expense.groupId)}
                      </p>
                    )}
                    <ExpenseHistoryRow
                      expense={expense}
                      returnTo={detailUrl}
                      restoring={false}
                    />
                  </div>
                ))}
              </Card>
            ) : (
              <EmptyState>
                Once you share an expense with {row.name}, it will appear here.
              </EmptyState>
            )}
          </section>
        </TabsContent>
        <TabsContent value="payments">
          <section aria-labelledby="friend-payments" className="space-y-3">
            <div className="flex justify-end">
              <h2 id="friend-payments" className="sr-only">
                Payments
              </h2>
              <Button asChild variant="ghost" className="min-h-11">
                <Link href={"/settlements?friendId=" + id}>
                  View all payments
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
            {row.settlements.length ? (
              <Card className="gap-0 divide-y divide-border py-0">
                {row.settlements.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex min-w-0 items-start gap-3 p-4"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="break-words font-medium">
                        {payment.fromUserId === profile.data.id
                          ? "You paid " + row.name
                          : row.name + " paid you"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <time dateTime={payment.date}>
                          {format(parseISO(payment.date), "d MMM yyyy")}
                        </time>{" "}
                        · {scopeName(payment.groupId ?? "direct")} ·{" "}
                        {payment.method === "UPI"
                          ? "UPI"
                          : payment.method === "CASH"
                            ? "Cash"
                            : "Other"}
                      </p>
                      {payment.note && (
                        <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                          {payment.note}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 space-y-2 text-right">
                      <Money
                        amount={payment.amount}
                        currency={payment.currency}
                        className="font-medium"
                      />
                      {payment.canEdit && (
                        <div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-11"
                                aria-label={
                                  "Payment actions for " + payment.date
                                }
                                disabled={remove.isPending}
                              >
                                <MoreHorizontal aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => void deletePayment(payment.id)}
                              >
                                Delete payment
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </Card>
            ) : (
              <EmptyState>
                No recorded payments with {row.name}. Record a payment after
                money changes hands.
              </EmptyState>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
