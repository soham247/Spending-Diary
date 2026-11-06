import type { listSettlements } from "@/lib/db/queries/settlements";
import type { getPaymentContext } from "@/lib/db/queries/payment-context";
import type { JsonValue } from "./types";
import type { CreateSettlementInput, SettlementListInput } from "@/lib/validation/settlement";

const BASE = "/api/settlements";
export type PaymentContext = JsonValue<Awaited<ReturnType<typeof getPaymentContext>>>;
export function apiPaymentContext() { return fetch(BASE + "/context").then(handleResponse<PaymentContext>); }

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
export async function apiRestoreSettlement(id: string) {
  return fetch("/api/settlements/" + encodeURIComponent(id) + "/restore", { method: "POST" }).then(handleResponse<{ id: string }>);
}

export type SettlementPage = JsonValue<Awaited<ReturnType<typeof listSettlements>>>;
export function apiListSettlements(input: SettlementListInput = {}) { const params=new URLSearchParams(Object.entries(input).filter((pair): pair is [string,string]=>pair[1]!==undefined)); return fetch("/api/settlements?"+params).then(handleResponse<SettlementPage>); }
