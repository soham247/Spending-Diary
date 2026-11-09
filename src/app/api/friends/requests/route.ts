import { requireSession } from "@/lib/auth/guards";
import { routeHandler, requireIdempotencyKey } from "@/lib/api/route-handler";
import { listFriendRequests } from "@/lib/api/server-queries";
import { sendFriendRequest } from "@/lib/domain/people";
import {
  createFriendRequestSchema,
  friendRequestListSchema,
} from "@/lib/validation/people";
import { requireSameOrigin } from "@/lib/api/request-origin";

export const GET = routeHandler(async (req) => {
  const { userId } = await requireSession(req);
  const input = friendRequestListSchema.parse({
    cursor: new URL(req.url).searchParams.get("cursor") ?? undefined,
  });
  return Response.json({ data: await listFriendRequests(userId, input) });
});
export const POST = routeHandler(async (req) => {
  const { userId } = await requireSession(req);
  requireSameOrigin(req);
  const key = requireIdempotencyKey(req);
  const input = createFriendRequestSchema.parse(await req.json());
  return Response.json(
    { data: { id: await sendFriendRequest(userId, input, key) } },
    { status: 201 },
  );
});
