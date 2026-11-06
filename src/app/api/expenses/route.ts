import { requireSession } from "@/lib/auth/guards";
import { routeHandler, requireIdempotencyKey } from "@/lib/api/route-handler";
import { listExpenses } from "@/lib/api/server-queries";
import { createExpenseSchema, expenseListSchema } from "@/lib/validation/expense";
import { createExpense } from "@/lib/domain/expenses";

export const GET = routeHandler(async req => {
  const { userId } = await requireSession(req);
  const input = expenseListSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return Response.json({ data: await listExpenses(userId, input) });
});

export const POST = routeHandler(async req => {
  const session = await requireSession(req);
  const key = requireIdempotencyKey(req);
  const input = createExpenseSchema.parse(await req.json());
  const id = await createExpense(session.userId, input, key);
  return Response.json({ data: { id } }, { status: 201 });
});
