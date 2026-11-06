import { requireSession } from "@/lib/auth/guards";
import { routeHandler } from "@/lib/api/route-handler";
export const GET = routeHandler(async req => { await requireSession(req); return Response.json({ data: { publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null } }); });
