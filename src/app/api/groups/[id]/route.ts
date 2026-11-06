import { requireSession } from "@/lib/auth/guards";
import { mapError } from "@/lib/api/route-handler";
import { getGroup } from "@/lib/api/server-queries";
import { updateGroup } from "@/lib/domain/groups";
import { updateGroupSchema } from "@/lib/validation/group";
interface Context { params: Promise<{ id: string }> }
export async function GET(req: Request, ctx: Context) {
  try { const { userId } = await requireSession(req); const { id } = await ctx.params; return Response.json({ data: await getGroup(userId, id) }); } catch (e) { return mapError(e); }
}
export async function PATCH(req: Request, ctx: Context) {
  try { const { userId } = await requireSession(req); const { id } = await ctx.params; await updateGroup(userId, id, updateGroupSchema.parse(await req.json())); return Response.json({ data: { id } }); } catch (e) { return mapError(e); }
}
