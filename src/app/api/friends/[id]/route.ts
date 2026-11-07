import { requireSession } from "@/lib/auth/guards";
import { mapError } from "@/lib/api/route-handler";
import { getFriend } from "@/lib/api/server-queries";
import { updateFriend } from "@/lib/domain/friends";
import { friendUpdateSchema } from "@/lib/validation/invite";
interface Context {
  params: Promise<{ id: string }>;
}
export async function GET(req: Request, ctx: Context) {
  try {
    const { userId } = await requireSession(req);
    const { id } = await ctx.params;
    return Response.json({ data: await getFriend(userId, id) });
  } catch (e) {
    return mapError(e);
  }
}
export async function PATCH(req: Request, ctx: Context) {
  try {
    const { userId } = await requireSession(req);
    const { id } = await ctx.params;
    await updateFriend(userId, id, friendUpdateSchema.parse(await req.json()));
    return Response.json({ data: { id } });
  } catch (e) {
    return mapError(e);
  }
}
