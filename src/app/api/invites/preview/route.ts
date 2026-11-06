import { routeHandler } from "@/lib/api/route-handler";
import { previewInvite } from "@/lib/domain/invites";
export const GET = routeHandler(async req => Response.json({ data: await previewInvite(new URL(req.url).searchParams.get("token") ?? "") }));
