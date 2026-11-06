"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiCreateSettlement, apiDeleteSettlement, apiRestoreSettlement, apiListSettlements, apiPaymentContext } from "@/lib/api/settlements";
import type { CreateSettlementInput, SettlementListInput } from "@/lib/validation/settlement";
export function usePaymentContext() { return useQuery({ queryKey: queryKeys.paymentContext(), queryFn: apiPaymentContext }); }

export function useCreateSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      idempotencyKey,
    }: {
      input: CreateSettlementInput;
      idempotencyKey: string;
    }) => apiCreateSettlement(input, idempotencyKey),
    onSuccess: (_data, { input }) => {
      for (const queryKey of queryKeys.money.roots()) void qc.invalidateQueries({ queryKey });
      if (input.groupId) {
        void qc.invalidateQueries({ queryKey: queryKeys.balances.group(input.groupId) });
      }
    },
  });
}

export function useDeleteSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDeleteSettlement(id),
    onSuccess: () => {
      for (const queryKey of queryKeys.money.roots()) void qc.invalidateQueries({ queryKey });
    },
  });
}
export function useRestoreSettlement() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: apiRestoreSettlement, onSuccess: async () => { await Promise.all(queryKeys.money.roots().map(queryKey => qc.invalidateQueries({ queryKey }))); } });
}

export function useSettlements(filters: Omit<SettlementListInput,"cursor"> = {}) { return useInfiniteQuery({ queryKey: queryKeys.settlements.list(filters),initialPageParam: undefined as string|undefined,queryFn: ({ pageParam })=>apiListSettlements({ ...filters,cursor: pageParam }),getNextPageParam: page=>page.nextCursor ?? undefined }); }
