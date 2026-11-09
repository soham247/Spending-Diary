"use client";
import { useEffect } from "react";
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
export function useExpenseHistoryScroll(key: string, ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const container = document.querySelector<HTMLElement>("[data-page-scroll]");
    if (!container) return;
    const storageKey = "expense-history-scroll:" + key;
    let frame = 0;
    try {
      const top = Number(sessionStorage.getItem(storageKey) ?? 0);
      frame = requestAnimationFrame(() => {
        container.scrollTop = Number.isFinite(top) ? top : 0;
      });
    } catch {
      container.scrollTop = 0;
    }
    function save() {
      try {
        sessionStorage.setItem(storageKey, String(container!.scrollTop));
      } catch {
        /* Storage may be unavailable */
      }
    }
    container.addEventListener("scroll", save, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      container.removeEventListener("scroll", save);
    };
  }, [key, ready]);
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
