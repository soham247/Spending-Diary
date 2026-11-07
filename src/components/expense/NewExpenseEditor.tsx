"use client";

import { useProfile } from "@/hooks/use-profile";
import { useFriends } from "@/hooks/use-friends";
import { useGroup, useGroups } from "@/hooks/use-groups";
import { SharedExpenseForm } from "./SharedExpenseForm";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";

export function NewExpenseEditor({
  groupId,
  friendId,
}: {
  groupId?: string;
  friendId?: string;
}) {
  const profile = useProfile();
  const friends = useFriends();
  const groups = useGroups();
  const group = useGroup(groupId ?? "");
  if (
    profile.isPending ||
    friends.isPending ||
    groups.isPending ||
    (groupId && group.isPending)
  )
    return <LoadingState />;
  if (
    profile.isError ||
    friends.isError ||
    groups.isError ||
    (groupId && group.isError)
  )
    return (
      <ErrorState
        retry={() => {
          void profile.refetch();
          void friends.refetch();
          void groups.refetch();
          if (groupId) void group.refetch();
        }}
      />
    );
  if (groupId && !group.data?.canWrite)
    return <ErrorState message="This group is read-only." />;
  const eligibleFriends = friends.data.filter(
    (person) => !person.blocked && person.status !== "DELETED",
  );
  const viewer = { id: profile.data.id, name: profile.data.name };
  const people = groupId
    ? group.data!.members.filter((person) => person.status === "ACTIVE")
    : [viewer, ...eligibleFriends];
  return (
    <SharedExpenseForm
      viewerId={viewer.id}
      people={people}
      groupId={groupId}
      initialParticipantIds={
        groupId
          ? people.map((person) => person.id)
          : [
              viewer.id,
              ...eligibleFriends
                .filter((person) => person.id === friendId)
                .map((person) => person.id),
            ]
      }
      composer={{
        viewer,
        friends: eligibleFriends,
        groups: groups.data.filter((item) => !item.archivedAt),
        groupName: group.data?.name,
      }}
    />
  );
}
