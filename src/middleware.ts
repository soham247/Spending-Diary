import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Read NextAuth JWT (requires NEXTAUTH_SECRET)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const isAuthenticated = !!token

  // Public routes that authenticated users should not access
  const publicRoutes = new Set(["/", "/pricing", "/login", "/register"]) // (public) and (auth)
  const isPublicRoute = publicRoutes.has(pathname)

  // Protected app routes
  const isProtectedRoute =
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/expense") ||
    pathname.startsWith("/friends") ||
    pathname.startsWith("/profile")

  // If authenticated and trying to access a public page, redirect to /expense
  if (isAuthenticated && isPublicRoute) {
    const url = req.nextUrl.clone()
    url.pathname = "/expense"
    return NextResponse.redirect(url)
  }

  // If not authenticated and trying to access a protected page, redirect to /login
  if (!isAuthenticated && isProtectedRoute) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Run middleware on both protected pages and public pages we may redirect from
  matcher: [
    "/", // homepage
    "/pricing",
    "/login",
    "/register",
    "/analytics/:path*",
    "/expense/:path*",
    "/friends/:path*",
    "/profile/:path*",
  ],
}
