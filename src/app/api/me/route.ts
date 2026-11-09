import { requireSession } from "@/lib/auth/guards";
import { routeHandler } from "@/lib/api/route-handler";
import { getProfile } from "@/lib/api/server-queries";
import { updateProfile } from "@/lib/domain/profile";
import { updateProfileSchema } from "@/lib/validation/profile";
import { requireSameOrigin } from "@/lib/api/request-origin";

export const GET = routeHandler(async (req) => {
  const { userId } = await requireSession(req);
  return Response.json({ data: await getProfile(userId) });
});
export const PATCH = routeHandler(async (req) => {
  const { userId } = await requireSession(req);
  requireSameOrigin(req);
  const input = updateProfileSchema.parse(await req.json());
  return Response.json({ data: await updateProfile(userId, input) });
});
