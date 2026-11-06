import { requireSession } from "@/lib/auth/guards";
import { routeHandler } from "@/lib/api/route-handler";
import { listExpenses } from "@/lib/api/server-queries";
import { expenseListSchema } from "@/lib/validation/expense";

export const GET = routeHandler(async req => {
  const { userId } = await requireSession(req);
  const input = expenseListSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return Response.json({ data: await listExpenses(userId, input) });
});
