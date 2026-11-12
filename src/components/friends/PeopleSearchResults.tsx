"use client";

import Link from "next/link";
import { useRef } from "react";
import { toast } from "sonner";
import { usePeopleSearch, useSendFriendRequest } from "@/hooks/use-friends";
import type { PersonSearchResult } from "@/lib/validation/people";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InvitePanel } from "@/components/invite/InvitePanel";

export function PeopleSearchResults({
  query,
  onSelect,
  selectedIds = [],
  excludeIds = [],
}: {
  query: string;
  onSelect?: (person: { id: string; name: string }) => void;
  selectedIds?: string[];
  excludeIds?: string[];
}) {
  const result = usePeopleSearch(query);
  const send = useSendFriendRequest();
  const keys = useRef(new Map<string, string>());
  async function request(person: PersonSearchResult) {
    const input = {
      userId: person.id,
      ...(person.source === "EMAIL"
        ? { email: query.trim().toLowerCase() }
        : {}),
    };
    const identity = JSON.stringify(input);
    let key = keys.current.get(identity);
    if (!key) {
      key = crypto.randomUUID();
      keys.current.set(identity, key);
    }
    try {
      await send.mutateAsync({ input, key });
      toast.success("Friend request sent. They will need to accept.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't send request",
      );
      void result.refetch();
    }
  }
  if (!query.trim()) return null;
  const visible = result.data?.filter(
    (person) => !excludeIds.includes(person.id),
  );
  if (
    !result.waiting &&
    result.isSuccess &&
    result.data.length > 0 &&
    !visible?.length
  )
    return null;
  return (
    <div className="space-y-3" aria-live="polite" aria-busy={result.waiting}>
      {result.waiting || result.isPending ? (
        <div
          role="status"
          aria-label="Searching for people"
          className="space-y-3"
        >
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : result.isError ? (
        <div role="alert" className="space-y-3 border-t border-border pt-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {"Couldn't search for people"}
            </p>
            <p className="break-words text-sm text-muted-foreground">
              {result.error.message}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => void result.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : result.data.length ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Search results
          </h3>
          <Card className="gap-0 overflow-hidden divide-y divide-border py-0 shadow-none">
            {visible?.map((person) => (
              <div
                key={person.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <span className="min-w-0 space-y-1 break-words font-medium">
                  {person.name}
                  <span className="block text-sm font-normal text-muted-foreground">
                    {person.relationship === "FRIEND"
                      ? "Already your friend"
                      : person.source === "CONTEXT"
                        ? "In a group with you"
                        : "Email match"}
                  </span>
                </span>
                {person.relationship === "FRIEND" ? (
                  onSelect ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      disabled={selectedIds.includes(person.id)}
                      onClick={() => onSelect(person)}
                    >
                      {selectedIds.includes(person.id) ? "Selected" : "Select"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      asChild
                    >
                      <Link href={"/friends/" + person.id}>Open friend</Link>
                    </Button>
                  )
                ) : person.relationship === "OUTGOING" ? (
                  <span className="text-sm text-muted-foreground">
                    Request pending
                  </span>
                ) : person.relationship === "INCOMING" ? (
                  <span className="text-sm text-muted-foreground">
                    Incoming request — review it in Friends
                  </span>
                ) : (
                  <Button
                    type="button"
                    className="min-h-11"
                    disabled={send.isPending}
                    onClick={() => void request(person)}
                  >
                    {send.isPending &&
                    send.variables?.input.userId === person.id
                      ? "Sending…"
                      : "Send friend request"}
                  </Button>
                )}
              </div>
            ))}
          </Card>
        </div>
      ) : (
        <div className="space-y-4 border-t border-border pt-4">
          <div className="space-y-2">
            <p className="font-medium">No matching person found</p>
          </div>
          <InvitePanel
            input={{ type: "PERSONAL" }}
            createLabel="Invite to Spending Diary"
          />
        </div>
      )}
    </div>
  );
}
