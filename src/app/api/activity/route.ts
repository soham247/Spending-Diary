import { requireSession } from "@/lib/auth/guards";
import { routeHandler } from "@/lib/api/route-handler";
import { listActivity } from "@/lib/api/server-queries";
import { activityListSchema } from "@/lib/validation/activity";
export const GET = routeHandler(async req => { const { userId } = await requireSession(req); return Response.json({ data: await listActivity(userId, activityListSchema.parse(Object.fromEntries(new URL(req.url).searchParams))) }); });
