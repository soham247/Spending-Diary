import { requireSession } from "@/lib/auth/guards";
import { routeHandler } from "@/lib/api/route-handler";
import { anonymizeAccount } from "@/lib/domain/account";
import { deleteAccountSchema } from "@/lib/validation/notifications";
export const POST = routeHandler(async req => { const { userId } = await requireSession(req); const { password } = deleteAccountSchema.parse(await req.json()); await anonymizeAccount(userId,req.headers,password); return Response.json({ data: { anonymized: true } }); });
