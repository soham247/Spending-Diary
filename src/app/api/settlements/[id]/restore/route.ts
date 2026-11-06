import { schedulePush } from "@/lib/push/schedule";
﻿import { requireSession } from "@/lib/auth/guards";
import { mapError } from "@/lib/api/route-handler";
import { restoreSettlement } from "@/lib/domain/settlements";
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) { try { const { userId } = await requireSession(req); const { id } = await ctx.params; await restoreSettlement(userId, id);
    schedulePush(); return Response.json({ data: { id } }); } catch (e) { return mapError(e); } }
