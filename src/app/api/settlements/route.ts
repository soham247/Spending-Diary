import { requireSession } from "@/lib/auth/guards";
import { routeHandler, requireIdempotencyKey } from "@/lib/api/route-handler";
import { createSettlementSchema } from "@/lib/validation/settlement";
import { createSettlement } from "@/lib/domain/settlements";

export const POST = routeHandler(async (req) => {
  const session = await requireSession(req);
  const key = requireIdempotencyKey(req);
  const raw = createSettlementSchema.parse(await req.json());

  const settlementId = await createSettlement({
    groupId: raw.groupId ?? null,
    fromUserId: raw.fromUserId,
    toUserId: raw.toUserId,
    amount: raw.amount,
    currency: raw.currency,
    method: raw.method,
    date: raw.date,
    note: raw.note ?? null,
    createdById: session.userId,
    idempotencyKey: key,
  });

  return Response.json({ data: { id: settlementId } }, { status: 201 });
});

