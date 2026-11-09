import { requireSession } from "@/lib/auth/guards";
import { routeHandler } from "@/lib/api/route-handler";
import { respondFriendRequest } from "@/lib/domain/people";
import { respondFriendRequestSchema } from "@/lib/validation/people";
import { entityId } from "@/lib/validation/money";
import { requireSameOrigin } from "@/lib/api/request-origin";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  return routeHandler(async (request) => {
    const { userId } = await requireSession(request);
    requireSameOrigin(request);
    const id = entityId.parse((await context.params).id);
    const input = respondFriendRequestSchema.parse(await request.json());
    return Response.json({
      data: { id: await respondFriendRequest(userId, id, input) },
    });
  })(req);
}
