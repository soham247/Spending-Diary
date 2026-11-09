import { ForbiddenError } from "@/lib/utils/errors";

export function requireSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const expected = new URL(process.env.NEXT_PUBLIC_APP_URL ?? req.url).origin;
  if (
    req.headers.get("sec-fetch-site") === "cross-site" ||
    (origin !== null && origin !== expected)
  )
    throw new ForbiddenError("Requests must come from Spending Diary");
}
