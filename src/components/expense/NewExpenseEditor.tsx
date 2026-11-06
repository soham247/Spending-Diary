"use client";
import { useState } from "react";
import { useProfile } from "@/hooks/use-profile";
import { useFriends } from "@/hooks/use-friends";
import { useGroups } from "@/hooks/use-groups";
import { SharedExpenseForm } from "./SharedExpenseForm";
import { PersonalExpenseForm } from "./PersonalExpenseForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { GroupExpenseEditor } from "./GroupExpenseEditor";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Label } from "@/components/ui/label";
export function NewExpenseEditor({ groupId, friendId }: { groupId?: string; friendId?: string }) {
  const profile = useProfile(); const friends = useFriends(); const groups = useGroups();
  const [scope, setScope] = useState(groupId ? "group:" + groupId : friendId ? "friend:" + friendId : "personal");
  if (profile.isPending || friends.isPending || groups.isPending) return <LoadingState />;
  if (profile.isError || friends.isError || groups.isError) return <ErrorState retry={() => { void profile.refetch(); void friends.refetch(); void groups.refetch(); }} />;
  const friend = friends.data.find(p => "friend:" + p.id === scope);
  const eligibleFriends = friends.data.filter(f => !f.blocked && f.status !== "DELETED");
  const viewer = { id: profile.data.id, name: profile.data.name };
  return <div className="space-y-6"><div className="space-y-2 rounded-xl border border-border bg-card p-4"><Label htmlFor="expense-context">Who is this expense for?</Label><Select value={scope} onValueChange={setScope}><SelectTrigger id="expense-context" aria-label="Expense context" aria-describedby="expense-context-help" className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="personal">Just for you</SelectItem><SelectItem value="friends">Split with friends</SelectItem>{groups.data.filter(g => !g.archivedAt).map(g => <SelectItem key={g.id} value={"group:" + g.id}>{g.name}</SelectItem>)}{eligibleFriends.map(f => <SelectItem key={f.id} value={"friend:" + f.id}>{f.name}</SelectItem>)}</SelectContent></Select><p id="expense-context-help" className="text-sm leading-relaxed text-muted-foreground">Choose yourself, friends, or a group. Your diary only counts your share.</p></div>
    {scope.startsWith("group:") ? <GroupExpenseEditor key={scope} id={scope.slice(6)} viewerId={profile.data.id} /> : scope === "friends" ? eligibleFriends.length ? <div className="space-y-4"><p className="text-sm text-muted-foreground">Choose the people to include in this expense. No group is created.</p><SharedExpenseForm key={scope} viewerId={profile.data.id} people={[viewer, ...eligibleFriends]} initialParticipantIds={[viewer.id, eligibleFriends[0].id]} /></div> : <EmptyState action={<Button asChild><Link href="/friends">Add friends</Link></Button>}>Add a friend or someone by name to split an expense.</EmptyState> : friend ? <SharedExpenseForm key={scope} viewerId={profile.data.id} people={[viewer, friend]} /> : <PersonalExpenseForm viewerId={profile.data.id} />}
  </div>;
}
