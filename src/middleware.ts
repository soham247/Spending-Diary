import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { safeRedirect } from "@/lib/utils/url";

const SESSION_COOKIE = "better-auth.session_token";
const SECURE_SESSION_COOKIE = "__Secure-better-auth.session_token";

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const hasSession =
    req.cookies.has(SESSION_COOKIE) ||
    req.cookies.has(SECURE_SESSION_COOKIE);

  // No cookie → redirect to login with callbackUrl
  if (!hasSession) {
    const callbackUrl = safeRedirect(pathname + search);
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(url);
  }

  // Do NOT redirect away from /login here. A stale cookie must reach
  // the page, which checks the real session via getOptionalSession.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/home/:path*",
    "/groups/:path*",
    "/friends/:path*",
    "/expenses/:path*",
    "/activity/:path*",
    "/insights/:path*",
    "/settings/:path*",
  ],
};
