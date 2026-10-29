import { requireSession } from "@/lib/auth/guards";
import { mapError } from "@/lib/api/route-handler";
import { editExpenseSchema } from "@/lib/validation/expense";
import { editExpense, deleteExpense } from "@/lib/domain/expenses";
import { getExpenseById } from "@/lib/db/queries/expenses";
import { NotFoundError } from "@/lib/utils/errors";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await requireSession(_req);
    const expense = await getExpenseById(session.userId, id);
    if (!expense) throw new NotFoundError();
    return Response.json({ data: expense });
  } catch (err) {
    return mapError(err);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireSession(req);
    const raw = editExpenseSchema.parse(await req.json());

    await editExpense({
      expenseId: id,
      version: raw.version,
      description: raw.description,
      category: raw.category,
      notes: raw.notes,
      amount: raw.amount,
      currency: raw.currency,
      date: raw.date,
    });

    return Response.json({ data: { id } });
  } catch (err) {
    return mapError(err);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await requireSession(_req);
    await deleteExpense(id);
    return Response.json({ data: { id } });
  } catch (err) {
    return mapError(err);
  }
}
