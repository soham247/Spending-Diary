"use client";

import { toast } from "sonner";
import {
  useFriendRequests,
  useRespondFriendRequest,
} from "@/hooks/use-friends";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";

export function FriendRequests() {
  const requests = useFriendRequests();
  const respond = useRespondFriendRequest();
  async function answer(id: string, action: "ACCEPT" | "DECLINE") {
    try {
      await respond.mutateAsync({ id, input: { action } });
      toast.success(
        action === "ACCEPT"
          ? "Friend request accepted"
          : "Friend request declined",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't answer request",
      );
      void requests.refetch();
    }
  }
  if (requests.isPending) return <LoadingState />;
  if (requests.isError)
    return <ErrorState retry={() => void requests.refetch()} />;
  const items = requests.data.pages.flatMap((page) => page.items);
  if (!items.length) return null;
  return (
    <section aria-label="Friend requests" className="space-y-3">
      <h2 className="text-lg font-semibold">Friend requests</h2>
      <p className="text-sm text-muted-foreground">
        Only accept people you recognize. If names match, compare the request
        code with your friend in a conversation you trust.
      </p>
      <Card className="gap-0 divide-y divide-border py-0">
        {items.map((request) => (
          <div
            key={request.id}
            className="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <p className="min-w-0 break-words">
              {request.name}
              <span className="block text-sm text-muted-foreground">
                {request.incoming
                  ? "Wants to connect and share direct expenses"
                  : "Request pending"}
              </span>
              <span className="block text-sm text-muted-foreground">
                Request code:{" "}
                <span translate="no" className="font-mono">
                  {request.id.slice(-8).toUpperCase()}
                </span>
              </span>
            </p>
            {request.incoming && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  className="min-h-11"
                  disabled={respond.isPending}
                  onClick={() => void answer(request.id, "ACCEPT")}
                >
                  Accept
                </Button>
                <Button
                  type="button"
                  className="min-h-11"
                  variant="outline"
                  disabled={respond.isPending}
                  onClick={() => void answer(request.id, "DECLINE")}
                >
                  Decline
                </Button>
              </div>
            )}
          </div>
        ))}
      </Card>
      {requests.hasNextPage && (
        <Button
          type="button"
          variant="outline"
          disabled={requests.isFetchingNextPage}
          onClick={() => void requests.fetchNextPage()}
        >
          {requests.isFetchingNextPage ? "Loading…" : "Show more requests"}
        </Button>
      )}
    </section>
  );
}
