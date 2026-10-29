import { requireSession } from "@/lib/auth/guards";
import { mapError } from "@/lib/api/route-handler";
import { restoreExpense } from "@/lib/domain/expenses";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    await requireSession(_req);
    await restoreExpense(id);
    return Response.json({ data: { id } });
  } catch (err) {
    return mapError(err);
  }
}
