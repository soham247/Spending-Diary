"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useFriends } from "@/hooks/use-friends";
import { friendBalances } from "@/lib/domain/friend-balances";
import { AddPersonDrawer } from "./AddPersonDrawer";
import { AddFriendDrawer } from "./AddFriendDrawer";
import { FriendRequests } from "./FriendRequests";
import { FriendBalance } from "./FriendBalance";
import { FriendsLoading } from "./FriendsLoading";
import { PayFriendDrawer } from "./PayFriendDrawer";
import { FriendRowActions } from "./FriendRowActions";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageLayout } from "@/components/shell/PageLayout";

const filters = [
  { value: "all", label: "All" },
  { value: "outstanding", label: "Outstanding" },
  { value: "settled", label: "Settled up" },
  { value: "blocked", label: "Blocked" },
] as const;

export function FriendsScreen() {
  const friends = useFriends();
  const params = useSearchParams();
  const query = params.get("q") ?? "";
  const filter = params.get("filter") ?? "all";
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value && !(key === "filter" && value === "all")) next.set(key, value);
    else next.delete(key);
    window.history.replaceState(
      null,
      "",
      "/friends" + (next.size ? "?" + next : ""),
    );
  }
  const visible = friends.data
    ?.filter((friend) => {
      if (
        !friend.name
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase())
      )
        return false;
      const outstanding = friendBalances(friend.balances).some(
        (balance) => balance.net !== 0,
      );
      return filter === "outstanding"
        ? outstanding
        : filter === "settled"
          ? !outstanding
          : filter === "blocked"
            ? friend.blocked
            : true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const returnTo = "/friends" + (params.size ? "?" + params : "");
  return (
    <PageLayout
      header={
        <PageHeader
          title="Friends"
          actions={
            <>
              <PayFriendDrawer />
              <AddFriendDrawer />
            </>
          }
        />
      }
      contentClassName="mx-auto max-w-3xl"
    >
      <FriendRequests />
      <section aria-label="Your friends" className="space-y-3">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground"
          />
          <Input
            type="search"
            name="friends"
            aria-label="Search your friends"
            placeholder="Search your friends…"
            autoComplete="off"
            value={query}
            onChange={(event) => update("q", event.target.value)}
            className="min-h-11 pl-9 pr-12"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Clear search"
              className="absolute right-0 top-0 size-11"
              onClick={() => update("q", "")}
            >
              <X aria-hidden="true" />
            </Button>
          )}
        </div>
        <div
          role="group"
          aria-label="Filter friends"
          className="flex flex-wrap gap-1"
        >
          {filters.map((item) => (
            <Button
              key={item.value}
              variant={filter === item.value ? "secondary" : "ghost"}
              aria-pressed={filter === item.value}
              className="min-h-11"
              onClick={() => update("filter", item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            className="text-sm font-medium text-muted-foreground"
            aria-live="polite"
          >
            {friends.data
              ? `${visible?.length ?? 0} ${visible?.length === 1 ? "person" : "people"}`
              : "Your friends"}
          </h2>
          <AddPersonDrawer
            trigger={
              <Button variant="ghost" className="min-h-11">
                Track by name
              </Button>
            }
          />
        </div>
        {friends.isPending ? (
          <FriendsLoading />
        ) : !friends.data ? (
          <ErrorState
            message="Couldn't load your friends. Try again."
            retry={() => void friends.refetch()}
          />
        ) : friends.data.length === 0 ? (
          <EmptyState>
            Add a friend to split your next expense, or track someone by name
            before they join.
          </EmptyState>
        ) : !visible?.length ? (
          <EmptyState
            action={
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() =>
                  window.history.replaceState(null, "", "/friends")
                }
              >
                Reset filters
              </Button>
            }
          >
            No friends match your search and filters. Try another name or reset
            the filters.
          </EmptyState>
        ) : (
          <Card className="gap-0 overflow-hidden divide-y divide-border py-0">
            {visible.map((friend) => (
              <div
                key={friend.id}
                className="flex min-w-0 items-center transition-colors hover:bg-muted focus-within:bg-muted"
              >
                <Link
                  href={
                    "/friends/" +
                    friend.id +
                    "?returnTo=" +
                    encodeURIComponent(returnTo)
                  }
                  className="flex min-h-20 min-w-0 flex-1 items-center gap-3 p-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  <Avatar aria-hidden="true">
                    <AvatarFallback>
                      {friend.name.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block break-words font-medium">
                      {friend.name}
                    </span>
                    <span className="block text-xs text-muted-foreground sm:text-sm">
                      {friend.blocked
                        ? "Blocked"
                        : friend.status === "INVITED"
                          ? "Tracked by name"
                          : "Friend"}
                    </span>
                  </span>
                  <div className="shrink-0 text-right">
                    <FriendBalance balances={friend.balances} />
                  </div>
                </Link>
                <FriendRowActions friend={friend} />
              </div>
            ))}
          </Card>
        )}
      </section>
    </PageLayout>
  );
}
