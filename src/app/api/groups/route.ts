import { requireSession } from "@/lib/auth/guards";
import { routeHandler, requireIdempotencyKey } from "@/lib/api/route-handler";
import { createGroup } from "@/lib/domain/groups";
import { listGroups } from "@/lib/api/server-queries";
import { createGroupSchema } from "@/lib/validation/group";
export const GET = routeHandler(async (req) => {
  const { userId } = await requireSession(req);
  return Response.json({ data: await listGroups(userId) });
});
export const POST = routeHandler(async (req) => {
  const { userId } = await requireSession(req);
  const key = requireIdempotencyKey(req);
  const input = createGroupSchema.parse(await req.json());
  return Response.json(
    { data: { id: await createGroup(userId, input, key) } },
    { status: 201 },
  );
});
