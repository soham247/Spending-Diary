import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, accounts, sessions, pushSubscriptions, invites } from "@/lib/db/schema";
import { auth } from "@/lib/auth/auth";
import { assertActiveViewer } from "@/lib/auth/guards";
import { ForbiddenError } from "@/lib/utils/errors";
export async function anonymizeAccount(viewerId: string, requestHeaders: Headers, password?: string) {
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session || session.user.id !== viewerId) throw new ForbiddenError();
  const methods = await db.select({ provider: accounts.providerId }).from(accounts).where(eq(accounts.userId,viewerId));
  if (methods.some(method => method.provider === "credential")) {
    if (!password) throw new ForbiddenError("Enter your current password");
    try { await auth.api.verifyPassword({ headers: requestHeaders, body: { password } }); } catch { throw new ForbiddenError("Verify your current password or sign in again"); }
  } else if (!methods.some(method => method.provider === "google") || new Date(session.session.createdAt).getTime() < Date.now()-300000) {
    throw new ForbiddenError("Sign in with Google again before deleting your account");
  }
  await db.transaction(async tx => {
    await assertActiveViewer(viewerId,tx);
    await tx.delete(accounts).where(eq(accounts.userId,viewerId));
    await tx.delete(sessions).where(eq(sessions.userId,viewerId));
    await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userId,viewerId));
    await tx.update(invites).set({ revokedAt: new Date() }).where(eq(invites.inviterId,viewerId));
    await tx.update(users).set({ status: "DELETED", name: "Former member", email: "deleted+"+viewerId+"@spendingdiary.invalid", emailVerified: false, phone: null, upiId: null, image: null, notificationPrefs: null, deletedAt: new Date() }).where(eq(users.id,viewerId));
  });
}
