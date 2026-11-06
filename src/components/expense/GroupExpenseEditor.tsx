"use client";
import { useGroup } from "@/hooks/use-groups";
import { SharedExpenseForm } from "./SharedExpenseForm";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
export function GroupExpenseEditor({ id, viewerId }: { id: string; viewerId: string }) {
  const group = useGroup(id);
  if (group.isPending) return <LoadingState />;
  if (group.isError) return <ErrorState retry={() => void group.refetch()} />;
  if (!group.data.canWrite) return <ErrorState message="This group is read-only." />;
  return <SharedExpenseForm groupId={id} viewerId={viewerId} people={group.data.members.filter(p => p.status === "ACTIVE")} />;
}
