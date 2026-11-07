"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  apiListFriends,
  apiGetFriend,
  apiCreatePlaceholder,
  apiUpdateFriend,
} from "@/lib/api/friends";
export function useFriends() {
  return useQuery({
    queryKey: queryKeys.friends.all(),
    queryFn: apiListFriends,
  });
}
export function useFriend(id: string) {
  return useQuery({
    queryKey: queryKeys.friends.detail(id),
    queryFn: () => apiGetFriend(id),
  });
}
function useInvalidateFriends() {
  const client = useQueryClient();
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.friends.all() }),
      ...queryKeys.money
        .roots()
        .map((queryKey) => client.invalidateQueries({ queryKey })),
    ]);
  };
}
export function useCreatePlaceholder() {
  const invalidate = useInvalidateFriends();
  return useMutation({
    mutationFn: apiCreatePlaceholder,
    onSuccess: invalidate,
  });
}
export function useUpdateFriend() {
  const invalidate = useInvalidateFriends();
  return useMutation({ mutationFn: apiUpdateFriend, onSuccess: invalidate });
}
