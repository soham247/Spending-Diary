import { requireSession } from "@/lib/auth/guards";
import { mapError } from "@/lib/api/route-handler";
import { deleteSettlement } from "@/lib/domain/settlements";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    await requireSession(_req);
    await deleteSettlement(id);
    return Response.json({ data: { id } });
  } catch (err) {
    return mapError(err);
  }
}
