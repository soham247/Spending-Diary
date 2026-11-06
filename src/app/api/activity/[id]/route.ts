import { requireSession } from "@/lib/auth/guards";
import { mapError } from "@/lib/api/route-handler";
import { markActivityRead } from "@/lib/domain/activity";
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) { try { const { userId } = await requireSession(req); const { id } = await ctx.params; await markActivityRead(userId, id); return Response.json({ data: { id } }); } catch (e) { return mapError(e); } }
