import { requireSession } from "@/lib/auth/guards";
import { mapError } from "@/lib/api/route-handler";
import { changeGroupMember } from "@/lib/domain/groups";
import { memberActionSchema } from "@/lib/validation/group";
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { const { userId } = await requireSession(req); const { id } = await ctx.params; await changeGroupMember(userId, id, memberActionSchema.parse(await req.json())); return Response.json({ data: { id } }); } catch (e) { return mapError(e); }
}
