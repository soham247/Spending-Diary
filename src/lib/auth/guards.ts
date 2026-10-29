import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { auth } from "./auth";
import { db, type Database, type DbTx } from "@/lib/db/client";
import { balances, expenseParticipants, expenses, friendships, groupMembers, groups, settlements, users } from "@/lib/db/schema";
import { DomainError, ForbiddenError, UnauthorizedError, NotFoundError } from "@/lib/utils/errors";
import { orderPair } from "@/lib/utils/order-pair";

interface SessionResult { userId: string; email: string }
function active(session: Awaited<ReturnType<typeof auth.api.getSession>>): session is NonNullable<typeof session> {
  return !!session?.user && (session.user as Record<string, unknown>).status === "ACTIVE" && session.user.emailVerified && !(session.user as Record<string, unknown>).deletedAt;
}
export async function requireSession(req: Request): Promise<SessionResult> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!active(session)) throw new UnauthorizedError();
  return { userId: session.user.id, email: session.user.email };
}
export async function assertServerSession(): Promise<SessionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!active(session)) redirect("/login");
  return { userId: session.user.id, email: session.user.email };
}
export async function getOptionalSession(): Promise<SessionResult | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return active(session) ? { userId: session.user.id, email: session.user.email } : null;
}
export async function assertActiveViewer(viewerId: string, tx: DbTx) {
  const [viewer] = await tx.select().from(users).where(and(eq(users.id, viewerId), eq(users.status, "ACTIVE"), eq(users.emailVerified, true), isNull(users.deletedAt))).for("share");
  if (!viewer) throw new UnauthorizedError();
}
export async function assertGroupMember(viewerId: string, groupId: string, tx: DbTx | Database = db, forWrite = false) {
  const [membership] = await tx.select({ group: groups, role: groupMembers.role }).from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, viewerId), eq(groupMembers.status, "ACTIVE"))).for("share");
  if (!membership) throw new NotFoundError();
  if (forWrite && membership.group.archivedAt) throw new ForbiddenError("Archived groups are read-only");
  return membership;
}
async function assertUnblocked(viewerId: string, otherId: string, tx: DbTx, requireFriend: boolean) {
  const [low, high] = orderPair(viewerId, otherId);
  const [friendship] = await tx.select().from(friendships).where(and(eq(friendships.userLowId, low), eq(friendships.userHighId, high))).for("share");
  if (friendship?.status === "BLOCKED" || (requireFriend && friendship?.status !== "ACCEPTED")) throw new NotFoundError();
}
export async function assertExpenseParticipants(viewerId: string, groupId: string | null, participantIds: string[], currency: string, tx: DbTx) {
  await assertActiveViewer(viewerId, tx);
  const people = await tx.select().from(users).where(inArray(users.id, participantIds)).for("share");
  if (people.length !== participantIds.length || people.some(p => p.status === "DELETED" || p.deletedAt)) throw new NotFoundError();
  if (groupId) {
    const { group } = await assertGroupMember(viewerId, groupId, tx, true);
    if (currency !== group.currency) throw new DomainError("Currency must match the group");
    const memberships = await tx.select().from(groupMembers).where(and(eq(groupMembers.groupId, groupId), inArray(groupMembers.userId, participantIds), eq(groupMembers.status, "ACTIVE"))).for("share");
    if (memberships.length !== participantIds.length) throw new NotFoundError();
  } else if (!participantIds.includes(viewerId)) {
    throw new NotFoundError();
  }
  for (const otherId of [...participantIds].sort()) if (otherId !== viewerId) await assertUnblocked(viewerId, otherId, tx, !groupId);
}
export async function assertCanEditExpense(viewerId: string, expense: typeof expenses.$inferSelect, tx: DbTx) {
  await assertActiveViewer(viewerId, tx);
  const [participant] = await tx.select().from(expenseParticipants).where(and(eq(expenseParticipants.expenseId, expense.id), eq(expenseParticipants.userId, viewerId)));
  const membership = expense.groupId ? await assertGroupMember(viewerId, expense.groupId, tx, true) : null;
  if (!participant && membership?.role !== "ADMIN") throw new NotFoundError();
}
export async function assertCanRecordSettlement(viewerId: string, input: { groupId: string | null; fromUserId: string; toUserId: string; currency: string }, tx: DbTx) {
  await assertActiveViewer(viewerId, tx);
  if (input.groupId) {
    const { group } = await assertGroupMember(viewerId, input.groupId, tx, true);
    if (group.currency !== input.currency) throw new DomainError("Currency must match the group");
    for (const id of [input.fromUserId, input.toUserId].sort()) await assertGroupMember(id, input.groupId, tx);
    const [low, high] = orderPair(input.fromUserId, input.toUserId);
    const [friendship] = await tx.select().from(friendships).where(and(eq(friendships.userLowId, low), eq(friendships.userHighId, high))).for("share");
    return friendship?.status === "BLOCKED";
  } else {
    if (viewerId !== input.fromUserId && viewerId !== input.toUserId) throw new NotFoundError();
    const otherId = viewerId === input.fromUserId ? input.toUserId : input.fromUserId;
    const [low, high] = orderPair(viewerId, otherId);
    const [friendship] = await tx.select().from(friendships).where(and(eq(friendships.userLowId, low), eq(friendships.userHighId, high))).for("share");
    if (!friendship) throw new NotFoundError();
    return friendship.status === "BLOCKED";
  }
}
export async function assertBlockedSettlementDebt(viewerId: string, input: { groupId?: string | null; fromUserId: string; toUserId: string; currency: string; amount: number }, tx: DbTx) {
  if (viewerId !== input.fromUserId && viewerId !== input.toUserId) throw new NotFoundError();
  const [low, high] = orderPair(input.fromUserId, input.toUserId);
  const [balance] = await tx.select().from(balances).where(and(eq(balances.scopeId, input.groupId ?? "direct"), eq(balances.userLowId, low), eq(balances.userHighId, high), eq(balances.currency, input.currency))).for("update");
  const debt = (balance?.amount ?? BigInt(0)) * (input.fromUserId === low ? BigInt(1) : BigInt(-1));
  if (debt <= BigInt(0) || BigInt(input.amount) > debt) throw new DomainError("Blocked friends can only settle their existing debt");
}
export async function assertCanDeleteSettlement(viewerId: string, settlement: typeof settlements.$inferSelect, tx: DbTx) {
  await assertActiveViewer(viewerId, tx);
  if (viewerId !== settlement.fromUserId && viewerId !== settlement.toUserId) throw new NotFoundError();
  if (settlement.groupId) await assertGroupMember(viewerId, settlement.groupId, tx, true);
}
