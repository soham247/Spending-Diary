import { requireSession } from "@/lib/auth/guards";
import { routeHandler, requireIdempotencyKey } from "@/lib/api/route-handler";
import { createSettlementSchema } from "@/lib/validation/settlement";
import { createSettlement } from "@/lib/domain/settlements";

export const POST = routeHandler(async req => {
  const session = await requireSession(req);
  const key = requireIdempotencyKey(req);
  const input = createSettlementSchema.parse(await req.json());
  const id = await createSettlement(session.userId, input, key);
  return Response.json({ data: { id } }, { status: 201 });
});
