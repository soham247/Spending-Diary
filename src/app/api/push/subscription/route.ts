import { requireSession } from "@/lib/auth/guards";
import { routeHandler } from "@/lib/api/route-handler";
import { saveSubscription, removeSubscription } from "@/lib/domain/push";
import { subscriptionSchema, deleteSubscriptionSchema } from "@/lib/validation/notifications";
export const PUT = routeHandler(async req => { const { userId } = await requireSession(req); await saveSubscription(userId,subscriptionSchema.parse(await req.json())); return Response.json({ data: { subscribed: true } }); });
export const DELETE = routeHandler(async req => { const { userId } = await requireSession(req); const { endpoint } = deleteSubscriptionSchema.parse(await req.json()); await removeSubscription(userId,endpoint); return Response.json({ data: { subscribed: false } }); });
