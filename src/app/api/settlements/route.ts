import { requireSession } from "@/lib/auth/guards";
import { routeHandler, requireIdempotencyKey } from "@/lib/api/route-handler";
import {
  createSettlementSchema,
  settlementListSchema,
} from "@/lib/validation/settlement";
import { listSettlements } from "@/lib/api/server-queries";
import { createSettlement } from "@/lib/domain/settlements";

export const POST = routeHandler(async (req) => {
  const session = await requireSession(req);
  const key = requireIdempotencyKey(req);
  const input = createSettlementSchema.parse(await req.json());
  const id = await createSettlement(session.userId, input, key);
  return Response.json({ data: { id } }, { status: 201 });
});

export const GET = routeHandler(async (req) => {
  const { userId } = await requireSession(req);
  const input = settlementListSchema.parse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  return Response.json({ data: await listSettlements(userId, input) });
});
