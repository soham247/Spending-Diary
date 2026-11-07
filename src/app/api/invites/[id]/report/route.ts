import { requireSession } from "@/lib/auth/guards";
import { mapError, requireIdempotencyKey } from "@/lib/api/route-handler";
import { reportInviteClaim } from "@/lib/domain/invites";
import { reportClaimSchema } from "@/lib/validation/invite";
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireSession(req);
    const key = requireIdempotencyKey(req);
    const { id } = await ctx.params;
    return Response.json(
      {
        data: {
          id: await reportInviteClaim(
            userId,
            id,
            reportClaimSchema.parse(await req.json()),
            key,
          ),
        },
      },
      { status: 201 },
    );
  } catch (e) {
    return mapError(e);
  }
}
