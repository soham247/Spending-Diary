"use client";
import { ExpenseDrawer } from "@/components/expense/ExpenseDrawer";

import Link from "next/link";
import { ArrowRight, BookOpen, Plus, Users } from "lucide-react";
import { useBalances } from "@/hooks/use-balances";
import { useProfile } from "@/hooks/use-profile";
import { useFriends } from "@/hooks/use-friends";
import { useGroups } from "@/hooks/use-groups";
import { balanceSummary } from "@/lib/domain/balance-summary";
import { Money } from "@/components/money/Money";
import { NetBalance } from "@/components/money/NetBalance";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function HomeScreen() {
  const balances = useBalances();
  const profile = useProfile();
  const friends = useFriends();
  const groups = useGroups();
  if (
    balances.isPending ||
    profile.isPending ||
    friends.isPending ||
    groups.isPending
  )
    return <LoadingState />;
  if (balances.isError || profile.isError || friends.isError || groups.isError)
    return (
      <ErrorState
        retry={() => {
          void balances.refetch();
          void profile.refetch();
          void friends.refetch();
          void groups.refetch();
        }}
      />
    );
  const summary = balanceSummary(profile.data.id, balances.data);
  const unsettledFriends = friends.data.filter((friend) =>
    friend.balances.some((balance) => balance.net !== 0),
  );

  return (
    <div className="space-y-8">
      <section
        aria-labelledby="home-title"
        className="space-y-5 border-b border-border pb-8"
      >
        <h1 id="home-title" className="text-xl font-semibold">
          Where you stand
        </h1>
        {summary.totals.length === 0 ? (
          <div className="space-y-2">
            <p className="text-3xl font-semibold leading-tight">
              You are all settled up
            </p>
            <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
              Add an expense for yourself or split one with friends. Your share
              goes into your spending diary.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {summary.totals.map((row) => (
              <p className="text-2xl leading-snug" key={row.currency}>
                {row.net < 0
                  ? "Overall, you owe"
                  : row.net > 0
                    ? "Overall, you are owed"
                    : "Your net balance is"}
                <span className="mt-1 block text-4xl font-semibold tracking-tight">
                  <Money
                    amount={Math.abs(row.net)}
                    currency={row.currency}
                    tone={
                      row.net < 0 ? "debit" : row.net > 0 ? "credit" : "neutral"
                    }
                  />
                </span>
              </p>
            ))}
            <p className="text-sm text-muted-foreground">
              Open a friend or group to see the details and settle up
            </p>
          </div>
        )}
        <ExpenseDrawer
          trigger={
            <Button className="w-full sm:w-auto">
              <Plus strokeWidth={1.75} aria-hidden="true" />
              Add expense
            </Button>
          }
        />
      </section>

      <section aria-labelledby="people-title" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="people-title"
            className="text-sm font-medium text-muted-foreground"
          >
            People
          </h2>
          <Button asChild variant="ghost">
            <Link href="/friends">
              All friends
              <ArrowRight aria-hidden="true" strokeWidth={1.75} />
            </Link>
          </Button>
        </div>
        {unsettledFriends.length === 0 ? (
          <EmptyState
            action={
              <Button asChild variant="outline">
                <Link href="/friends">
                  {friends.data.length ? "View friends" : "Add a friend"}
                </Link>
              </Button>
            }
          >
            {friends.data.length
              ? "No outstanding balances with friends. Shared expenses will appear here when there is something to settle."
              : "Sharing a meal or a cab? Add a friend by name, or send them an invite link."}
          </EmptyState>
        ) : (
          <Card className="gap-0 py-0 divide-y divide-border">
            {unsettledFriends.map((friend) => (
              <Link
                key={friend.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2"
                href={"/friends/" + friend.id}
              >
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar aria-hidden="true">
                    <AvatarFallback>
                      {friend.name.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 break-words font-medium">
                    {friend.name}
                    <span className="block text-sm font-normal text-muted-foreground">
                      Direct and group expenses
                    </span>
                  </span>
                </span>
                <NetBalance
                  balances={summary.people.filter(
                    (row) => row.userId === friend.id,
                  )}
                />
              </Link>
            ))}
          </Card>
        )}
      </section>

      <section aria-labelledby="groups-title" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="groups-title"
            className="text-sm font-medium text-muted-foreground"
          >
            Groups
          </h2>
          <Button asChild variant="ghost">
            <Link href="/groups">
              All groups
              <ArrowRight aria-hidden="true" strokeWidth={1.75} />
            </Link>
          </Button>
        </div>
        {groups.data.length === 0 ? (
          <EmptyState
            action={
              <Button asChild variant="outline">
                <Link href="/groups">
                  <Users aria-hidden="true" strokeWidth={1.75} />
                  Create a group
                </Link>
              </Button>
            }
          >
            Keep a trip, your flat, or everyday costs together. Each group has
            its own expenses and balances.
          </EmptyState>
        ) : (
          <Card className="gap-0 py-0 divide-y divide-border">
            {groups.data.map((group) => {
              const rows = summary.groups.filter(
                (row) => row.scopeId === group.id,
              );
              return (
                <Link
                  key={group.id}
                  href={"/groups/" + group.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <BookOpen
                        className="size-5"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="min-w-0 break-words font-medium">
                      {group.name}
                      {group.archivedAt ? (
                        <span className="block text-sm font-normal text-muted-foreground">
                          Archived
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <NetBalance
                    balances={
                      rows.length
                        ? rows
                        : [{ currency: group.currency, net: 0 }]
                    }
                  />
                </Link>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
