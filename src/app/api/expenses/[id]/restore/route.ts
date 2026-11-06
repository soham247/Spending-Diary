import { requireSession } from "@/lib/auth/guards";
import { mapError } from "@/lib/api/route-handler";
import { restoreExpense } from "@/lib/domain/expenses";

interface Ctx { params: Promise<{ id: string }> }
export async function POST(req: Request, ctx: Ctx) {
  try {
    const session = await requireSession(req);
    const { id } = await ctx.params;
    await restoreExpense(session.userId, id);
    return Response.json({ data: { id } });
  } catch (error) { return mapError(error); }
}
