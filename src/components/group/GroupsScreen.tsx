"use client";
import { useState } from "react";
import Link from "next/link";
import { useGroups } from "@/hooks/use-groups";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { CreateGroupDrawer } from "./CreateGroupDrawer";
import { Card } from "@/components/ui/card";
export function GroupsScreen() {
  const groups = useGroups();
  const [archived, setArchived] = useState(false);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Groups</h1>
        <CreateGroupDrawer />
      </div>
      <Button variant="outline" onClick={() => setArchived((value) => !value)}>
        {archived ? "Active groups" : "Archived groups"}
      </Button>
      {groups.isPending ? (
        <LoadingState />
      ) : groups.isError ? (
        <ErrorState retry={() => void groups.refetch()} />
      ) : groups.data.filter((g) => !!g.archivedAt === archived).length ===
        0 ? (
        <EmptyState>
          {archived
            ? "No archived groups."
            : "Create a group for a trip, your flat, or anything you share."}
        </EmptyState>
      ) : (
        <Card className="gap-0 py-0 divide-y divide-border">
          {groups.data
            .filter((g) => !!g.archivedAt === archived)
            .map((group) => (
              <Link
                className="block p-4 hover:bg-muted focus-visible:outline-ring"
                key={group.id}
                href={"/groups/" + group.id}
              >
                {group.name}
                <p className="text-sm text-muted-foreground">{group.type}</p>
              </Link>
            ))}
        </Card>
      )}
    </div>
  );
}
