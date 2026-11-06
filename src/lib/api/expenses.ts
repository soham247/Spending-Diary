import type { CreateExpenseInput, EditExpenseInput } from "@/lib/validation/expense";

const BASE = "/api/expenses";

async function handleResponse<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message ?? "Request failed");
  return body.data as T;
}

export async function apiCreateExpense(
  input: CreateExpenseInput,
  idempotencyKey: string,
) {
  const res = await fetch(`${BASE}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(input),
  });
  return handleResponse<{ id: string }>(res);
}

export async function apiEditExpense(
  id: string,
  input: EditExpenseInput,
) {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<{ id: string }>(res);
}

export async function apiDeleteExpense(id: string) {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  return handleResponse<{ id: string }>(res);
}

export async function apiRestoreExpense(id: string) {
  const res = await fetch(`${BASE}/${id}/restore`, { method: "POST" });
  return handleResponse<{ id: string }>(res);
}
