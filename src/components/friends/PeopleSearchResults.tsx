"use client";

import Link from "next/link";
import { useRef } from "react";
import { toast } from "sonner";
import { usePeopleSearch, useSendFriendRequest } from "@/hooks/use-friends";
import type { PersonSearchResult } from "@/lib/validation/people";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
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
        <LoadingState />
      ) : result.isError ? (
        <ErrorState
          message={result.error.message}
          retry={() => void result.refetch()}
        />
      ) : result.data.length ? (
        <Card className="gap-0 divide-y divide-border py-0">
          {visible?.map((person) => (
            <div
              key={person.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <span className="min-w-0 break-words">
                {person.name}
                <span className="block text-sm text-muted-foreground">
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
                  {send.isPending && send.variables?.input.userId === person.id
                    ? "Sending…"
                    : "Send friend request"}
                </Button>
              )}
            </div>
          ))}
        </Card>
      ) : (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <p>No matching person found.</p>
          <p className="text-sm text-muted-foreground">
            They may keep their account private. Share your connection link so
            they can send you a request.
          </p>
          <InvitePanel
            input={{ type: "PERSONAL" }}
            createLabel="Invite to Spending Diary"
          />
        </div>
      )}
    </div>
  );
}
