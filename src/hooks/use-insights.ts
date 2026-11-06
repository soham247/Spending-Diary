"use client";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiGetInsights } from "@/lib/api/insights";
import { queryKeys } from "@/lib/query-keys";
export function useInsights(month: string, kind?: "PERSONAL" | "SHARED") { return useQuery({ queryKey: queryKeys.insights.month(month,kind), queryFn: () => apiGetInsights(month,kind), placeholderData: keepPreviousData }); }
