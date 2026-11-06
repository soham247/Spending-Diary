import { requireSession } from "@/lib/auth/guards";
import { mapError } from "@/lib/api/route-handler";
import { editExpenseSchema } from "@/lib/validation/expense";
import { editExpense, deleteExpense } from "@/lib/domain/expenses";
import { getExpenseById } from "@/lib/api/server-queries";
import { NotFoundError } from "@/lib/utils/errors";

interface Ctx { params: Promise<{ id: string }> }
export async function GET(req: Request, ctx: Ctx) {
  try {
    const session = await requireSession(req);
    const { id } = await ctx.params;
    const expense = await getExpenseById(session.userId, id);
    if (!expense) throw new NotFoundError();
    return Response.json({ data: expense });
  } catch (error) { return mapError(error); }
}
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const session = await requireSession(req);
    const { id } = await ctx.params;
    const input = editExpenseSchema.parse(await req.json());
    await editExpense(session.userId, id, input);
    return Response.json({ data: { id } });
  } catch (error) { return mapError(error); }
}
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const session = await requireSession(req);
    const { id } = await ctx.params;
    await deleteExpense(session.userId, id);
    return Response.json({ data: { id } });
  } catch (error) { return mapError(error); }
}
