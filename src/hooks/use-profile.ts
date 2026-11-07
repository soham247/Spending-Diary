"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGetProfile, apiUpdateProfile } from "@/lib/api/profile";
import { queryKeys } from "@/lib/query-keys";

export function useProfile() {
  return useQuery({ queryKey: queryKeys.me(), queryFn: apiGetProfile });
}
export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: apiUpdateProfile,
    onSuccess: (profile) => {
      client.setQueryData(queryKeys.me(), profile);
    },
  });
}
