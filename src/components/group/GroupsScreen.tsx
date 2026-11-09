"use client";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { useGroups } from "@/hooks/use-groups";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { CreateGroupDrawer } from "./CreateGroupDrawer";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageLayout } from "@/components/shell/PageLayout";
export function GroupsScreen() {
  const groups = useGroups();
  return (
    <PageLayout
      header={<PageHeader title="Groups" actions={<CreateGroupDrawer />} />}
      contentClassName="max-w-3xl"
    >
      <Tabs defaultValue="active" className="gap-6">
        <TabsList aria-label="Group status">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
        {["active", "archived"].map((status) => {
          const archived = status === "archived";
          const visibleGroups = groups.data?.filter(
            (group) => !!group.archivedAt === archived,
          );
          return (
            <TabsContent key={status} value={status}>
              {groups.isPending ? (
                <LoadingState />
              ) : groups.isError ? (
                <ErrorState retry={() => void groups.refetch()} />
              ) : !visibleGroups?.length ? (
                <EmptyState>
                  {archived
                    ? "No archived groups."
                    : "Create a group for a trip, your flat, or anything you share."}
                </EmptyState>
              ) : (
                <Card className="gap-0 py-0 divide-y divide-border">
                  {visibleGroups.map((group) => (
                    <Link
                      className="flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                      key={group.id}
                      href={"/groups/" + group.id}
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <BookOpen className="size-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 break-words font-medium">
                        {group.name}
                        <span className="block text-sm font-normal text-muted-foreground">
                          {group.type}
                        </span>
                      </span>
                    </Link>
                  ))}
                </Card>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </PageLayout>
  );
}
