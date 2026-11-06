import { requireSession } from "@/lib/auth/guards";
import { mapError } from "@/lib/api/route-handler";
import { revokeInvite } from "@/lib/domain/invites";
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) { try { const { userId } = await requireSession(req); const { id } = await ctx.params; await revokeInvite(userId, id); return Response.json({ data: { id } }); } catch (e) { return mapError(e); } }
