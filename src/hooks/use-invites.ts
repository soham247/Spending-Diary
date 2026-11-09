"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  apiCreateInvite,
  apiClaimInvite,
  apiPreviewInvite,
  apiRevokeInvite,
  apiReportInviteClaim,
} from "@/lib/api/invites";
export function useCreateInvite() {
  return useMutation({ mutationFn: apiCreateInvite });
}
export function useRevokeInvite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: apiRevokeInvite,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: queryKeys.friends.requests() }),
  });
}
export function useInvitePreview(token: string) {
  return useQuery({
    queryKey: queryKeys.invites.preview(token),
    queryFn: () => apiPreviewInvite(token),
    retry: false,
  });
}
export function useClaimInvite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: apiClaimInvite,
    onSuccess: () => {
      for (const queryKey of [
        ...queryKeys.money.roots(),
        queryKeys.groups.all(),
        queryKeys.friends.all(),
        queryKeys.expenses.all(),
      ])
        void client.invalidateQueries({ queryKey });
    },
  });
}
export function useReportInviteClaim() {
  return useMutation({ mutationFn: apiReportInviteClaim });
}
