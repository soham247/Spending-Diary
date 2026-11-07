"use client";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  apiCreateExpense,
  apiEditExpense,
  apiDeleteExpense,
  apiRestoreExpense,
  apiGetExpense,
  apiListExpenses,
} from "@/lib/api/expenses";
import type {
  CreateExpenseInput,
  EditExpenseInput,
  ExpenseListInput,
} from "@/lib/validation/expense";

export function useExpenses(
  input: Omit<ExpenseListInput, "cursor"> = {},
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: queryKeys.expenses.list(input),
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      apiListExpenses({ ...input, cursor: pageParam }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}
export function useExpense(id: string) {
  return useQuery({
    queryKey: queryKeys.expenses.detail(id),
    queryFn: () => apiGetExpense(id),
  });
}
function useInvalidateExpenses() {
  const client = useQueryClient();
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.expenses.all() }),
      client.invalidateQueries({ queryKey: queryKeys.insightsRoot() }),
      client.invalidateQueries({ queryKey: queryKeys.activityRoot() }),
      ...queryKeys.money
        .roots()
        .map((queryKey) => client.invalidateQueries({ queryKey })),
    ]);
  };
}
export function useCreateExpense() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: ({
      input,
      idempotencyKey,
    }: {
      input: CreateExpenseInput;
      idempotencyKey: string;
    }) => apiCreateExpense(input, idempotencyKey),
    onSuccess: invalidate,
  });
}
export function useEditExpense() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EditExpenseInput }) =>
      apiEditExpense(id, input),
    onSuccess: invalidate,
  });
}
export function useDeleteExpense() {
  const invalidate = useInvalidateExpenses();
  return useMutation({ mutationFn: apiDeleteExpense, onSuccess: invalidate });
}
export function useRestoreExpense() {
  const invalidate = useInvalidateExpenses();
  return useMutation({ mutationFn: apiRestoreExpense, onSuccess: invalidate });
}
