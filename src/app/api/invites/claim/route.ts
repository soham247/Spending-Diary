import { requireSession } from "@/lib/auth/guards";
import { routeHandler } from "@/lib/api/route-handler";
import { claimGroupOrPersonalInvite } from "@/lib/domain/invites";
import { claimInviteSchema } from "@/lib/validation/invite";
export const POST = routeHandler(async (req) => {
  const { userId } = await requireSession(req);
  const { token } = claimInviteSchema.parse(await req.json());
  return Response.json({
    data: await claimGroupOrPersonalInvite(userId, token),
  });
});
