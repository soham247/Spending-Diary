"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiListGroups, apiGetGroup, apiCreateGroup, apiUpdateGroup, apiChangeMember } from "@/lib/api/groups";
export function useGroups() { return useQuery({ queryKey: queryKeys.groups.all(), queryFn: apiListGroups }); }
export function useGroup(id: string) { return useQuery({ queryKey: queryKeys.groups.detail(id), queryFn: () => apiGetGroup(id), enabled: !!id }); }
function useInvalidateGroups() { const client = useQueryClient(); return async () => { await Promise.all([client.invalidateQueries({ queryKey: queryKeys.groups.all() }), ...queryKeys.money.roots().map(queryKey => client.invalidateQueries({ queryKey }))]); }; }
export function useCreateGroup() { const invalidate = useInvalidateGroups(); return useMutation({ mutationFn: apiCreateGroup, onSuccess: invalidate }); }
export function useUpdateGroup() { const invalidate = useInvalidateGroups(); return useMutation({ mutationFn: apiUpdateGroup, onSuccess: invalidate }); }
export function useChangeMember() { const invalidate = useInvalidateGroups(); return useMutation({ mutationFn: apiChangeMember, onSuccess: invalidate }); }
