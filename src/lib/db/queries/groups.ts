import "server-only";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { groups, groupMembers, users, balances } from "@/lib/db/schema";
import { NotFoundError } from "@/lib/utils/errors";
import { toSafeNumber } from "@/lib/utils/to-safe-number";
import { simplifyDebts } from "@/lib/domain/simplify";
import { getGroupExpenses } from "./expenses";

export async function listGroups(viewerId: string) {
  return db
    .select({
      id: groups.id,
      name: groups.name,
      currency: groups.currency,
      type: groups.type,
      archivedAt: groups.archivedAt,
      role: groupMembers.role,
      status: groupMembers.status,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(eq(groupMembers.userId, viewerId))
    .orderBy(desc(groups.createdAt));
}
export async function getGroup(viewerId: string, groupId: string) {
  const [row] = await db
    .select({
      group: groups,
      role: groupMembers.role,
      status: groupMembers.status,
    })
    .from(groups)
    .innerJoin(groupMembers, eq(groupMembers.groupId, groups.id))
    .where(and(eq(groups.id, groupId), eq(groupMembers.userId, viewerId)));
  if (!row) throw new NotFoundError();
  const [members, rawBalances, expenses] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        upiId: users.upiId,
        status: groupMembers.status,
        role: groupMembers.role,
      })
      .from(groupMembers)
      .innerJoin(users, eq(users.id, groupMembers.userId))
      .where(eq(groupMembers.groupId, groupId)),
    db.select().from(balances).where(eq(balances.scopeId, groupId)),
    getGroupExpenses(viewerId, groupId),
  ]);
  const visibleBalances =
    row.status === "ACTIVE"
      ? rawBalances
      : rawBalances.filter(
          (b) => b.userLowId === viewerId || b.userHighId === viewerId,
        );
  const viewerBalances = visibleBalances
    .filter(
      (b) =>
        (b.userLowId === viewerId || b.userHighId === viewerId) &&
        b.amount !== BigInt(0),
    )
    .map((b) => ({
      scopeId: b.scopeId,
      currency: b.currency,
      net: toSafeNumber(b.userLowId === viewerId ? -b.amount : b.amount),
      otherId: b.userLowId === viewerId ? b.userHighId : b.userLowId,
    }));
  const nets = new Map<string, bigint>();
  for (const b of visibleBalances) {
    nets.set(b.userLowId, (nets.get(b.userLowId) ?? BigInt(0)) - b.amount);
    nets.set(b.userHighId, (nets.get(b.userHighId) ?? BigInt(0)) + b.amount);
  }
  return {
    ...row.group,
    simplifyDebts: row.status === "ACTIVE" && row.group.simplifyDebts,
    viewerBalances,
    viewerRole: row.role,
    viewerStatus: row.status,
    canManage: row.role === "ADMIN" && row.status === "ACTIVE",
    canWrite: row.status === "ACTIVE" && !row.group.archivedAt,
    members,
    expenses,
    balances: visibleBalances
      .filter((b) => b.amount !== BigInt(0))
      .map((b) => ({ ...b, amount: toSafeNumber(b.amount) })),
    suggestedPayments: simplifyDebts(
      [...nets].map(([userId, net]) => ({ userId, net: toSafeNumber(net) })),
    ),
  };
}
