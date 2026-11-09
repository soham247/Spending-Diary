import { requireSession } from "@/lib/auth/guards";
import { routeHandler } from "@/lib/api/route-handler";
import { findPeople } from "@/lib/domain/people";
import { peopleSearchSchema } from "@/lib/validation/people";
import { requireSameOrigin } from "@/lib/api/request-origin";

export const POST = routeHandler(async (req) => {
  const { userId } = await requireSession(req);
  requireSameOrigin(req);
  const { query } = peopleSearchSchema.parse(await req.json());
  return Response.json(
    { data: await findPeople(userId, query) },
    { headers: { "Cache-Control": "no-store" } },
  );
});
