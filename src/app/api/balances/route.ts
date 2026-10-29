import { requireSession } from "@/lib/auth/guards";
import { routeHandler } from "@/lib/api/route-handler";
import { getOverallBalances } from "@/lib/db/queries/balances";

/** GET /api/balances — overall balances for the signed-in user across all scopes. */
export const GET = routeHandler(async (req) => {
  const session = await requireSession(req);
  const rows = await getOverallBalances(session.userId);

  const data = rows.map((r) => ({
    scopeId: r.scopeId,
    userLowId: r.userLowId,
    userHighId: r.userHighId,
    currency: r.currency,
    // bigint → number at the API edge
    amount: Number(r.amount),
    updatedAt: r.updatedAt,
  }));

  return Response.json({ data });
});

