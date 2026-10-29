"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  apiCreateExpense,
  apiEditExpense,
  apiDeleteExpense,
  apiRestoreExpense,
} from "@/lib/api/expenses";
import type { CreateExpenseInput, EditExpenseInput } from "@/lib/validation/expense";

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      idempotencyKey,
    }: {
      input: CreateExpenseInput;
      idempotencyKey: string;
    }) => apiCreateExpense(input, idempotencyKey),
    onSuccess: (_data, { input }) => {
      for (const queryKey of queryKeys.money.roots()) void qc.invalidateQueries({ queryKey });
      if (input.groupId) {
        void qc.invalidateQueries({ queryKey: queryKeys.groups.expenses(input.groupId) });
        void qc.invalidateQueries({ queryKey: queryKeys.balances.group(input.groupId) });
      }
    },
  });
}

export function useEditExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EditExpenseInput }) =>
      apiEditExpense(id, input),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.expenses.detail(id) });
      for (const queryKey of queryKeys.money.roots()) void qc.invalidateQueries({ queryKey });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDeleteExpense(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: queryKeys.expenses.detail(id) });
      for (const queryKey of queryKeys.money.roots()) void qc.invalidateQueries({ queryKey });
    },
  });
}

export function useRestoreExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRestoreExpense(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: queryKeys.expenses.detail(id) });
      for (const queryKey of queryKeys.money.roots()) void qc.invalidateQueries({ queryKey });
    },
  });
}
