import { responseData } from "./client";
import type { getInsights } from "@/lib/db/queries/insights";
export type Insights = Awaited<ReturnType<typeof getInsights>>;
export const apiGetInsights = (month: string, kind?: "PERSONAL" | "SHARED") => fetch("/api/insights?" + new URLSearchParams({ month, ...(kind ? { kind } : {}) })).then(responseData<Insights>);
