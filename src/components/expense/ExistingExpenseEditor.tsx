"use client";
import { useState } from "react";
import { useProfile } from "@/hooks/use-profile";
import { useFriends } from "@/hooks/use-friends";
import { useGroup } from "@/hooks/use-groups";
import { useExpense } from "@/hooks/use-expenses";
import { SharedExpenseForm } from "./SharedExpenseForm";
import { PersonalExpenseForm } from "./PersonalExpenseForm";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
export function ExistingExpenseEditor({ id }: { id: string }) {
  const expense = useExpense(id); const profile = useProfile(); const friends = useFriends();
  const group = useGroup(expense.data?.groupId ?? "");
  const [revision, setRevision] = useState(0);
  if (expense.isPending || profile.isPending || friends.isPending || (expense.data?.groupId && group.isPending)) return <LoadingState />;
  if (expense.isError || profile.isError || friends.isError || (expense.data?.groupId && group.isError)) return <ErrorState retry={() => { void expense.refetch(); void profile.refetch(); void friends.refetch(); void group.refetch(); }} />;
  if (!expense.data || !profile.data || !friends.data || !expense.data.canEdit) return <ErrorState message="This expense is read-only." />;
  const reload = () => { void expense.refetch().then(result => { if (result.isSuccess) setRevision(value => value + 1); }); };
  const names = [{ id: profile.data.id, name: profile.data.name }, ...friends.data, ...(group.data?.members ?? [])];
  const candidates = expense.data.groupId ? group.data?.members.filter(person => person.status === "ACTIVE") ?? [] : friends.data.filter(person => !person.blocked);
  const ids = [...new Set([...expense.data.participants.map(p => p.userId),...candidates.map(person => person.id)])];
  const people = ids.map(id => ({ id,name: expense.data!.participants.find(person => person.userId === id)?.name ?? names.find(person => person.id === id)?.name ?? "Member" }));
  return expense.data.kind === "PERSONAL" ? <PersonalExpenseForm key={revision} viewerId={profile.data.id} expense={expense.data} reload={reload} /> : <SharedExpenseForm key={revision} groupId={expense.data.groupId} viewerId={profile.data.id} people={people} expense={expense.data} reload={reload} />;
}
