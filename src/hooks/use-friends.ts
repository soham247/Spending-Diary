"use client";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { queryKeys } from "@/lib/query-keys";
import {
  apiListFriends,
  apiGetFriend,
  apiCreatePlaceholder,
  apiUpdateFriend,
  apiSearchPeople,
  apiListFriendRequests,
  apiSendFriendRequest,
  apiRespondFriendRequest,
} from "@/lib/api/friends";
export function usePeopleSearch(value: string) {
  const query = value.trim();
  const [settled, setSettled] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSettled(query), 400);
    return () => clearTimeout(timer);
  }, [query]);
  const result = useQuery({
    queryKey: queryKeys.friends.search(query),
    queryFn: ({ signal }) => apiSearchPeople(query, signal),
    enabled: query.length > 0 && query.length <= 254 && settled === query,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  return { ...result, waiting: query !== settled || result.isFetching };
}
export function useFriendRequests() {
  return useInfiniteQuery({
    queryKey: queryKeys.friends.requests(),
    queryFn: ({ pageParam }) => apiListFriendRequests(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchInterval: 30000,
  });
}
export function useSendFriendRequest() {
  const invalidate = useInvalidateFriends();
  return useMutation({
    mutationFn: apiSendFriendRequest,
    onSuccess: invalidate,
  });
}
export function useRespondFriendRequest() {
  const invalidate = useInvalidateFriends();
  return useMutation({
    mutationFn: apiRespondFriendRequest,
    onSuccess: invalidate,
  });
}
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
