import { timingSafeEqual } from "node:crypto";
import { routeHandler } from "@/lib/api/route-handler";
import { UnauthorizedError } from "@/lib/utils/errors";
import { reconcileBalances } from "@/lib/domain/reconciliation";
import { dispatchPush } from "@/lib/push/dispatch";
export const GET = routeHandler(async (req) => {
  const expected = process.env.CRON_SECRET;
  const actual = req.headers.get("authorization") ?? "";
  const authorized = expected
    ? Buffer.from("Bearer " + expected)
    : Buffer.alloc(0);
  const received = Buffer.from(actual);
  if (
    !expected ||
    authorized.length !== received.length ||
    !timingSafeEqual(authorized, received)
  )
    throw new UnauthorizedError();
  const reconciliation = await reconcileBalances();
  const push = await dispatchPush();
  return Response.json({ data: { reconciliation, push } });
});
