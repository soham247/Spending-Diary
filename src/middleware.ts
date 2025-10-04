export { default } from "next-auth/middleware"

// Protect only authenticated app routes; leave public and auth pages accessible
export const config = {
  matcher: [
    "/analytics/:path*",
    "/expense/:path*",
    "/friends/:path*",
    "/profile/:path*",
  ],
}
