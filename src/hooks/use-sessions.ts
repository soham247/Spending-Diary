"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiListSessions, apiRevokeSession, apiAnonymizeAccount } from "@/lib/api/settings";
export function useSessions() { return useQuery({ queryKey: queryKeys.sessions(), queryFn: apiListSessions }); }
export function useRevokeSession() { const client = useQueryClient(); return useMutation({ mutationFn: apiRevokeSession, onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.sessions() }) }); }
export function useAnonymizeAccount() { const client = useQueryClient(); return useMutation({ mutationFn: apiAnonymizeAccount, onSuccess: () => client.clear() }); }
