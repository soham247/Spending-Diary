import { responseData } from "./client";
import type { JsonValue } from "./types";
import type { listActivity } from "@/lib/db/queries/activity";
export type ActivityPage = JsonValue<Awaited<ReturnType<typeof listActivity>>>;
export const apiListActivity = (input: { cursor?: string; groupId?: string; expenseId?: string }) => fetch("/api/activity?" + new URLSearchParams(Object.entries(input).filter((p): p is [string,string] => p[1] !== undefined))).then(responseData<ActivityPage>);
export const apiReadActivity = (id: string) => fetch("/api/activity/" + encodeURIComponent(id), { method: "PATCH" }).then(responseData<{ id: string }>);
