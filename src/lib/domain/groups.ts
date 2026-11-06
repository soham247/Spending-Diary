import "server-only";
import { recordActivity } from "./activity";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { groups, groupMembers, balances } from "@/lib/db/schema";
import { assertActiveViewer, assertGroupAdmin, assertGroupMember, assertCanConnect } from "@/lib/auth/guards";
import { createGroupSchema, updateGroupSchema, memberActionSchema, type CreateGroupInput, type UpdateGroupInput, type MemberActionInput } from "@/lib/validation/group";
import { DomainError, NotFoundError, ForbiddenError } from "@/lib/utils/errors";
import { reserveIdempotency } from "./idempotency";

export async function createGroup(viewerId: string, raw: CreateGroupInput, key: string) {
  const input = createGroupSchema.parse(raw);
  return db.transaction(async tx => {
    await assertActiveViewer(viewerId, tx);
    const reservation = await reserveIdempotency(tx, viewerId, "group", key, input);
    if (reservation.replayed) return reservation.id;
    await tx.insert(groups).values({ ...input, id: reservation.id, createdById: viewerId });
    await tx.insert(groupMembers).values({ groupId: reservation.id, userId: viewerId, role: "ADMIN" });
    await recordActivity(tx,viewerId,{ type: "GROUP_CREATED",groupId: reservation.id,recipientIds: [],metadata: { description: input.name } });
    return reservation.id;
  });
}
export async function updateGroup(viewerId: string, groupId: string, raw: UpdateGroupInput) {
  const { archived, ...input } = updateGroupSchema.parse(raw);
  await db.transaction(async tx => {
    await assertActiveViewer(viewerId, tx);
    await tx.select({ id: groups.id }).from(groups).where(eq(groups.id, groupId)).for("update");
    const membership = await assertGroupAdmin(viewerId, groupId, tx, false);
    if (membership.group.archivedAt && (Object.keys(input).length > 0 || archived !== false)) throw new ForbiddenError("Archived groups are read-only");
    await tx.update(groups).set({ ...input, ...(archived !== undefined ? { archivedAt: archived ? new Date() : null } : {}) }).where(eq(groups.id, groupId));
    await recordActivity(tx,viewerId,{ type: "GROUP_UPDATED",groupId,recipientIds: [],metadata: { description: input.name ?? membership.group.name } });
  });
}
export async function changeGroupMember(viewerId: string, groupId: string, raw: MemberActionInput) {
  const input = memberActionSchema.parse(raw);
  await db.transaction(async tx => {
    await assertActiveViewer(viewerId, tx);
    await tx.select({ id: groups.id }).from(groups).where(eq(groups.id, groupId)).for("update");
    if (input.action === "REJOIN") {
      const [group] = await tx.select().from(groups).where(eq(groups.id,groupId));
      const [previous] = await tx.select().from(groupMembers).where(and(eq(groupMembers.groupId,groupId),eq(groupMembers.userId,viewerId),eq(groupMembers.status,"LEFT")));
      if (!group || group.archivedAt || !previous) throw new NotFoundError();
      const peers = await tx.select().from(groupMembers).where(and(eq(groupMembers.groupId,groupId),eq(groupMembers.status,"ACTIVE")));
      for (const peer of peers) await assertCanConnect(viewerId,peer.userId,tx);
      await tx.update(groupMembers).set({ status: "ACTIVE",leftAt: null }).where(and(eq(groupMembers.groupId,groupId),eq(groupMembers.userId,viewerId)));
      await recordActivity(tx,viewerId,{ type: "MEMBER_JOINED",groupId,recipientIds: [],metadata: { description: group.name } });
      return;
    }
    const membership = await assertGroupMember(viewerId, groupId, tx, true);
    const target = input.action === "LEAVE" ? viewerId : input.userId;
    if (!target) throw new DomainError("Choose a member");
    if (input.action !== "LEAVE") await assertGroupAdmin(viewerId, groupId, tx);
    const [member] = await tx.select().from(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, target), eq(groupMembers.status, "ACTIVE")));
    if (!member) throw new NotFoundError();
    if (input.action === "PROMOTE") {
      await tx.update(groupMembers).set({ role: "ADMIN" }).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, target)));
      return;
    }
    if (member.role === "ADMIN") {
      const admins = await tx.select().from(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.role, "ADMIN"), eq(groupMembers.status, "ACTIVE")));
      if (admins.length === 1) throw new DomainError("Promote another admin before leaving or removing the last admin");
    }
    const debts = await tx.select().from(balances).where(and(eq(balances.scopeId, groupId), or(eq(balances.userLowId, target), eq(balances.userHighId, target))));
    const outstanding = debts.some(row => row.amount !== BigInt(0));
    if (outstanding && input.action === "LEAVE") throw new DomainError("Settle your group balances before leaving");
    if (outstanding && !input.confirmOutstandingBalance) throw new DomainError("Confirm removal with outstanding balances");
    await tx.update(groupMembers).set({ status: input.action === "LEAVE" ? "LEFT" : "REMOVED", leftAt: new Date() }).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, target)));
    await recordActivity(tx,viewerId,{ type: input.action === "LEAVE" ? "MEMBER_LEFT" : "MEMBER_REMOVED",groupId,recipientIds: [target],metadata: { description: membership.group.name,after: { userId: target } } });
  });
}
