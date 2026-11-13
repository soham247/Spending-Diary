"use client";
import { BackButton } from "@/components/common/BackButton";
import { ExpenseDrawer } from "@/components/expense/ExpenseDrawer";
import Link from "next/link";
import { AddPersonDrawer } from "@/components/friends/AddPersonDrawer";
import { useProfile } from "@/hooks/use-profile";
import { RecordPaymentSheet } from "@/components/settlement/RecordPaymentSheet";
import { SettleSheet } from "@/components/settlement/SettleSheet";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useGroup, useChangeMember } from "@/hooks/use-groups";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/money/Money";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { GroupSettings } from "./GroupSettings";
import { InvitePanel } from "@/components/invite/InvitePanel";
import { Card } from "@/components/ui/card";
import { PageHeaderAction } from "@/components/shell/PageHeaderAction";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageLayout } from "@/components/shell/PageLayout";
export function GroupScreen({ id }: { id: string }) {
  const group = useGroup(id);
  const profile = useProfile();
  const leave = useChangeMember();
  const router = useRouter();
  if (group.isPending || group.isError)
    return (
      <PageLayout
        header={
          <PageHeader
            title="Group"
            back={<BackButton href="/groups" label="Back to groups" />}
          />
        }
      >
        {group.isPending ? (
          <LoadingState />
        ) : (
          <ErrorState retry={() => void group.refetch()} />
        )}
      </PageLayout>
    );
  const row = group.data;
  const name = (userId: string) =>
    row.members.find((p) => p.id === userId)?.name ?? "Former member";
  async function exit() {
    try {
      await leave.mutateAsync({ id, input: { action: "LEAVE" } });
      router.push("/groups");
      toast("Left group", {
        duration: 6000,
        action: {
          label: "Undo",
          onClick: () => {
            void leave
              .mutateAsync({ id, input: { action: "REJOIN" } })
              .then(() => {
                toast.success("Rejoined group");
                router.push("/groups/" + id);
              })
              .catch(() =>
                toast.error(
                  "Could not rejoin this group. Ask an admin for an invitation.",
                ),
              );
          },
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't leave group");
    }
  }
  return (
    <PageLayout
      header={
        <PageHeader
          back={<BackButton href="/groups" label="Back to groups" />}
          title={row.name}
          description={
            <p>
              {row.members.length} people · {row.currency}
              {row.archivedAt ? " · Archived" : ""}
            </p>
          }
          actions={
            row.canWrite && (
              <ExpenseDrawer
                groupId={id}
                trigger={<PageHeaderAction label="Add expense" />}
              />
            )
          }
        />
      }
    >
      {!row.archivedAt && profile.data && (
        <RecordPaymentSheet viewerId={profile.data.id} scopeId={id} />
      )}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {row.simplifyDebts ? "Suggested payments" : "Balances"}
        </h2>
        {row.simplifyDebts ? (
          row.suggestedPayments.length === 0 ? (
            <p className="text-muted-foreground">Everyone is settled up.</p>
          ) : (
            row.suggestedPayments.map((payment, index) => (
              <p key={index}>
                {name(payment.debtorId)} pays {name(payment.creditorId)}{" "}
                <Money amount={payment.amount} />
              </p>
            ))
          )
        ) : (
          row.balances.map((balance, index) => (
            <p key={index}>
              {name(
                balance.amount > 0 ? balance.userLowId : balance.userHighId,
              )}{" "}
              owes{" "}
              {name(
                balance.amount > 0 ? balance.userHighId : balance.userLowId,
              )}{" "}
              <Money
                amount={Math.abs(balance.amount)}
                currency={balance.currency}
              />
            </p>
          ))
        )}
      </section>
      {!row.archivedAt &&
        profile.data &&
        row.viewerBalances.map((balance) => {
          const other = row.members.find((p) => p.id === balance.otherId);
          return other ? (
            <SettleSheet
              key={balance.scopeId + other.id}
              viewerId={profile.data.id}
              other={other}
              net={balance.net}
              scopeId={balance.scopeId}
              currency={balance.currency}
            />
          ) : null;
        })}
      {row.canManage && !row.archivedAt && (
        <>
          <InvitePanel input={{ type: "GROUP_LINK", groupId: id }} />
          <AddPersonDrawer groupId={id} />
        </>
      )}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Expenses</h2>
        {row.expenses.items.length === 0 ? (
          <EmptyState>
            No expenses yet. Add the first one, or invite people to join.
          </EmptyState>
        ) : (
          <Card className="gap-0 py-0 divide-y divide-border">
            {row.expenses.items.map((expense) => (
              <Link
                key={expense.id}
                className="flex justify-between gap-3 p-4"
                href={"/expenses/" + expense.id}
              >
                <span>
                  {expense.description}
                  <span className="block text-sm text-muted-foreground">
                    {expense.date}
                  </span>
                </span>
                <Money amount={expense.amount} currency={expense.currency} />
              </Link>
            ))}
          </Card>
        )}
      </section>
      <Link
        href={"/expenses?groupId=" + id}
        className="inline-block underline underline-offset-4"
      >
        View all group expenses and deleted items
      </Link>
      <Link
        href={"/settlements?groupId=" + id}
        className="inline-block underline underline-offset-4"
      >
        View all payments
      </Link>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Activity</h2>
        {row.viewerStatus === "ACTIVE" ? (
          <ActivityFeed groupId={id} />
        ) : (
          <p className="text-muted-foreground">
            Your shared expense history remains available above.
          </p>
        )}
      </section>
      {row.canManage && <GroupSettings key={row.updatedAt} group={row} />}
      {row.canWrite && (
        <Button
          variant="outline"
          disabled={leave.isPending}
          onClick={() => void exit()}
        >
          Leave group
        </Button>
      )}
    </PageLayout>
  );
}
