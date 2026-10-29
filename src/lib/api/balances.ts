const BASE = "/api/balances";

export interface BalanceRow {
  scopeId: string;
  userLowId: string;
  userHighId: string;
  currency: string;
  amount: number;
  updatedAt: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message ?? "Request failed");
  return body.data as T;
}

export async function apiGetBalances(): Promise<BalanceRow[]> {
  const res = await fetch(BASE);
  return handleResponse<BalanceRow[]>(res);
}
