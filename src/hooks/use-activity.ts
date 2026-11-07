"use client";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiListActivity, apiReadActivity } from "@/lib/api/activity";
import { queryKeys } from "@/lib/query-keys";
export function useActivity(
  filters: { groupId?: string; expenseId?: string } = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.activity(filters),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      apiListActivity({ ...filters, cursor: pageParam }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}
export function useReadActivity() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: apiReadActivity,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: queryKeys.activityRoot() }),
  });
}
