import { requireSession } from "@/lib/auth/guards";
import { routeHandler, requireIdempotencyKey } from "@/lib/api/route-handler";
import { createExpenseSchema } from "@/lib/validation/expense";
import { createExpense } from "@/lib/domain/expenses";

export const POST = routeHandler(async (req) => {
  const session = await requireSession(req);
  const key = requireIdempotencyKey(req);
  const raw = createExpenseSchema.parse(await req.json());

  const expenseId = await createExpense({
    groupId: raw.groupId ?? null,
    description: raw.description,
    category: raw.category,
    notes: "notes" in raw ? raw.notes : null,
    amount: raw.amount,
    currency: raw.currency,
    splitType: raw.splitType,
    date: raw.date,
    createdById: session.userId,
    participants: raw.participants.map((p) => ({
      userId: p.userId,
      paid: p.paid,
      owed: "owed" in p ? (p as { owed: number }).owed : undefined,
      percentage: "percentage" in p ? (p as { percentage: number }).percentage : undefined,
      shares: "shares" in p ? (p as { shares: number }).shares : undefined,
    })),
    idempotencyKey: key,
  });

  return Response.json({ data: { id: expenseId } }, { status: 201 });
});

