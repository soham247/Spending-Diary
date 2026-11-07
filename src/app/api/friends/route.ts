import { requireSession } from "@/lib/auth/guards";
import { routeHandler, requireIdempotencyKey } from "@/lib/api/route-handler";
import { listFriends } from "@/lib/api/server-queries";
import { createPlaceholder } from "@/lib/domain/friends";
import { placeholderSchema } from "@/lib/validation/invite";
export const GET = routeHandler(async (req) => {
  const { userId } = await requireSession(req);
  return Response.json({ data: await listFriends(userId) });
});
export const POST = routeHandler(async (req) => {
  const { userId } = await requireSession(req);
  const key = requireIdempotencyKey(req);
  return Response.json(
    {
      data: {
        id: await createPlaceholder(
          userId,
          placeholderSchema.parse(await req.json()),
          key,
        ),
      },
    },
    { status: 201 },
  );
});
