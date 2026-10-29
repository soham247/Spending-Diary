import { requireSession } from "@/lib/auth/guards";
import { mapError } from "@/lib/api/route-handler";
import { deleteSettlement } from "@/lib/domain/settlements";

interface Ctx { params: Promise<{ id: string }> }
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const session = await requireSession(req);
    const { id } = await ctx.params;
    await deleteSettlement(session.userId, id);
    return Response.json({ data: { id } });
  } catch (error) { return mapError(error); }
}
