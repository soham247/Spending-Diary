import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { UnauthorizedError, NotFoundError } from "@/lib/utils/errors";

interface SessionResult {
  userId: string;
  email: string;
}

/**
 * For route handlers: returns the authenticated user's id and email,
 * or throws UnauthorizedError (401).
 */
export async function requireSession(
  req: Request,
): Promise<SessionResult> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  // Block non-ACTIVE users
  const status = (session.user as Record<string, unknown>).status;
  if (status && status !== "ACTIVE") {
    throw new UnauthorizedError("Account is not active");
  }
  return { userId: session.user.id, email: session.user.email };
}

/**
 * For protected server pages and layouts: redirects to /login if no session.
 */
export async function assertServerSession(): Promise<SessionResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    redirect("/login");
  }
  const status = (session.user as Record<string, unknown>).status;
  if (status && status !== "ACTIVE") {
    redirect("/login");
  }
  return { userId: session.user.id, email: session.user.email };
}

/**
 * For /login and /verify-email pages: returns the session or null.
 * Never throws or redirects.
 */
export async function getOptionalSession(): Promise<SessionResult | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) return null;
    return { userId: session.user.id, email: session.user.email };
  } catch (err) {
    console.error("[guards] getOptionalSession failed:", err);
    return null;
  }
}

/**
 * Checks group membership. Throws NotFoundError if the viewer is not
 * an active member, hiding whether the group exists.
 */
export async function assertGroupMember(
  viewerId: string, // eslint-disable-line @typescript-eslint/no-unused-vars
  groupId: string,  // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<void> {
  // Implementation deferred until group queries exist.
  // Will query group_members where userId = viewerId AND groupId = groupId
  // AND status = 'ACTIVE'. Throws NotFoundError on miss.
  throw new NotFoundError();
}
