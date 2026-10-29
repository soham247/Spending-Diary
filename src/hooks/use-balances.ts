"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiGetBalances } from "@/lib/api/balances";

export function useBalances() {
  return useQuery({
    queryKey: queryKeys.balances.overall(),
    queryFn: apiGetBalances,
  });
}
