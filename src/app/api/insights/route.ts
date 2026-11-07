import { requireSession } from "@/lib/auth/guards";
import { routeHandler } from "@/lib/api/route-handler";
import { getInsights } from "@/lib/api/server-queries";
import { insightsInputSchema } from "@/lib/validation/insights";
export const GET = routeHandler(async (req) => {
  const { userId } = await requireSession(req);
  return Response.json({
    data: await getInsights(
      userId,
      insightsInputSchema.parse(
        Object.fromEntries(new URL(req.url).searchParams),
      ),
    ),
  });
});
