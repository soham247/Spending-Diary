"use client";
import Link from "next/link";
import { useFriends } from "@/hooks/use-friends";
import { AddPersonDrawer } from "./AddPersonDrawer";
import { AddFriendDrawer } from "./AddFriendDrawer";
import { FriendRequests } from "./FriendRequests";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageLayout } from "@/components/shell/PageLayout";
export function FriendsScreen() {
  const friends = useFriends();
  return (
    <PageLayout
      header={<PageHeader title="Friends" actions={<AddFriendDrawer />} />}
      contentClassName="max-w-3xl"
    >
      <FriendRequests />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Your friends
        </h2>
        <AddPersonDrawer />
      </div>
      {friends.isPending ? (
        <LoadingState />
      ) : friends.isError ? (
        <ErrorState retry={() => void friends.refetch()} />
      ) : friends.data.length === 0 ? (
        <EmptyState>
          Add a friend or track someone by name to start splitting expenses.
        </EmptyState>
      ) : (
        <Card className="gap-0 py-0 divide-y divide-border">
          {friends.data.map((friend) => (
            <Link
              key={friend.id}
              href={"/friends/" + friend.id}
              className="flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <Avatar aria-hidden="true">
                <AvatarFallback>
                  {friend.name.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 break-words font-medium">
                {friend.name}
                <span className="block text-sm font-normal text-muted-foreground">
                  {friend.blocked
                    ? "Blocked"
                    : friend.status === "INVITED"
                      ? "Not on Spending Diary yet"
                      : "Friend"}
                </span>
              </span>
            </Link>
          ))}
        </Card>
      )}
    </PageLayout>
  );
}
