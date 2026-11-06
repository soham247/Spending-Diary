import { requireSession } from "@/lib/auth/guards";
import { routeHandler, requireIdempotencyKey } from "@/lib/api/route-handler";
import { createInvite } from "@/lib/domain/invites";
import { createInviteSchema } from "@/lib/validation/invite";
export const POST = routeHandler(async req => {
  const { userId } = await requireSession(req); const key = requireIdempotencyKey(req);
  return Response.json({ data: await createInvite(userId, createInviteSchema.parse(await req.json()), key) }, { status: 201 });
});
