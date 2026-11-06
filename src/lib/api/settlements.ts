import type { CreateSettlementInput } from "@/lib/validation/settlement";

const BASE = "/api/settlements";

async function handleResponse<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message ?? "Request failed");
  return body.data as T;
}

export async function apiCreateSettlement(
  input: CreateSettlementInput,
  idempotencyKey: string,
) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(input),
  });
  return handleResponse<{ id: string }>(res);
}

export async function apiDeleteSettlement(id: string) {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  return handleResponse<{ id: string }>(res);
}
