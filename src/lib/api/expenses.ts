import type {
  CreateExpenseInput,
  EditExpenseInput,
  ExpenseListInput,
  ExpenseCategory,
} from "@/lib/validation/expense";
import { responseData } from "./client";

export interface Expense {
  id: string;
  groupId: string | null;
  kind: "PERSONAL" | "SHARED";
  description: string;
  category: ExpenseCategory;
  notes: string | null;
  amount: number;
  currency: "INR";
  date: string;
  splitType: "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";
  version: number;
  deletedAt: string | null;
}
export interface ExpenseDetail extends Expense {
  canEdit: boolean;
  participants: {
    userId: string;
    name: string;
    paid: number;
    owed: number;
    splitInput: string | null;
    includedInSplit: boolean;
  }[];
}
export interface ExpensePage {
  items: (Expense & { yourShare: number | null })[];
  nextCursor: string | null;
  spendingTotals?: { currency: string; amount: number }[];
}
export function apiListExpenses(input: ExpenseListInput = {}) {
  const params = new URLSearchParams(
    Object.entries(input).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
  return fetch("/api/expenses?" + params).then(responseData<ExpensePage>);
}
export const apiGetExpense = (id: string) =>
  fetch("/api/expenses/" + encodeURIComponent(id)).then(
    responseData<ExpenseDetail>,
  );
export const apiCreateExpense = (
  input: CreateExpenseInput,
  idempotencyKey: string,
) =>
  fetch("/api/expenses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(input),
  }).then(responseData<{ id: string }>);
export const apiEditExpense = (id: string, input: EditExpenseInput) =>
  fetch("/api/expenses/" + encodeURIComponent(id), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then(responseData<{ id: string }>);
export const apiDeleteExpense = (id: string) =>
  fetch("/api/expenses/" + encodeURIComponent(id), { method: "DELETE" }).then(
    responseData<{ id: string }>,
  );
export const apiRestoreExpense = (id: string) =>
  fetch("/api/expenses/" + encodeURIComponent(id) + "/restore", {
    method: "POST",
  }).then(responseData<{ id: string }>);
