import { requireSession } from "@/lib/auth/guards";
import { routeHandler } from "@/lib/api/route-handler";
import { getOverallBalances } from "@/lib/api/server-queries";
import { toSafeNumber } from "@/lib/utils/to-safe-number";

export const GET = routeHandler(async req => {
  const session = await requireSession(req);
  const rows = await getOverallBalances(session.userId);
  return Response.json({ data: rows.map(row => ({ ...row, amount: toSafeNumber(row.amount) })) });
});
