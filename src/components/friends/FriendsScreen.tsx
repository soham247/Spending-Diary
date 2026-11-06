"use client";
import Link from "next/link";
import { useFriends } from "@/hooks/use-friends";
import { AddPersonForm } from "./AddPersonForm";
import { InvitePanel } from "@/components/invite/InvitePanel";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
export function FriendsScreen() {
  const friends = useFriends();
  return <div className="space-y-6"><h1 className="text-2xl font-semibold">Friends</h1><InvitePanel input={{ type: "PERSONAL" }} /><AddPersonForm />
    {friends.isPending ? <LoadingState /> : friends.isError ? <ErrorState retry={() => void friends.refetch()} /> : friends.data.length === 0 ? <EmptyState>Share your personal link or add someone by name to start splitting expenses.</EmptyState> : <div className="divide-y divide-border rounded-xl border border-border bg-card">{friends.data.map(friend => <Link key={friend.id} href={"/friends/" + friend.id} className="block p-4 hover:bg-muted">{friend.name}<span className="block text-sm text-muted-foreground">{friend.blocked ? "Blocked" : friend.status === "INVITED" ? "Not on Spending Diary yet" : "Friend"}</span></Link>)}</div>}
  </div>;
}
