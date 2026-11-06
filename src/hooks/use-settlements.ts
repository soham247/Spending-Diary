"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiCreateSettlement, apiDeleteSettlement } from "@/lib/api/settlements";
import type { CreateSettlementInput } from "@/lib/validation/settlement";

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
