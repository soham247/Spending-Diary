import { requireSession } from "@/lib/auth/guards";
import { routeHandler } from "@/lib/api/route-handler";
import { getPaymentContext } from "@/lib/api/server-queries";

export const GET = routeHandler(async req => {
  const { userId } = await requireSession(req);
  return Response.json({ data: await getPaymentContext(userId) });
});
