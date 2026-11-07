import "server-only";
import { createHash, createHmac } from "node:crypto";
import { alias } from "drizzle-orm/pg-core";
import { and, eq, isNull, desc } from "drizzle-orm";
import { db, type DbTx } from "@/lib/db/client";
import {
  invites,
  users,
  groups,
  groupMembers,
  contacts,
  friendships,
  idempotencyRecords,
  balances,
  inviteClaimReports,
  expenses,
  expenseParticipants,
} from "@/lib/db/schema";
import {
  assertActiveViewer,
  assertGroupAdmin,
  assertCanConnect,
} from "@/lib/auth/guards";
import { DomainError, NotFoundError } from "@/lib/utils/errors";
import { orderPair } from "@/lib/utils/order-pair";
import {
  createInviteSchema,
  reportClaimSchema,
  tokenSchema,
  type CreateInviteInput,
} from "@/lib/validation/invite";
import { reserveIdempotency } from "./idempotency";
import { recordActivity } from "./activity";
import { mergePlaceholder } from "./merge";
import { toSafeNumber } from "@/lib/utils/to-safe-number";

function tokenFor(id: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Invite signing secret is not configured");
  return createHmac("sha256", secret)
    .update("invite:" + id)
    .digest("hex");
}
function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
function valid(invite: typeof invites.$inferSelect) {
  return (
    !invite.revokedAt &&
    (!invite.expiresAt || invite.expiresAt > new Date()) &&
    (invite.maxUses === null || invite.useCount < invite.maxUses)
  );
}
export async function createInvite(
  viewerId: string,
  raw: CreateInviteInput,
  key: string,
) {
  const input = createInviteSchema.parse(raw);
  return db.transaction(async (tx) => {
    await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, viewerId))
      .for("update");
    await assertActiveViewer(viewerId, tx);
    const reservation = await reserveIdempotency(
      tx,
      viewerId,
      "invite",
      key,
      input,
    );
    if (reservation.replayed)
      return { id: reservation.id, token: tokenFor(reservation.id) };
    if (input.type === "GROUP_LINK")
      await assertGroupAdmin(viewerId, input.groupId!, tx);
    if (input.type === "DIRECT") {
      const [placeholder] = await tx
        .select({ id: users.id })
        .from(users)
        .innerJoin(contacts, eq(contacts.userId, users.id))
        .where(
          and(
            eq(users.id, input.placeholderId!),
            eq(users.status, "INVITED"),
            eq(contacts.ownerId, viewerId),
          ),
        );
      if (!placeholder) throw new NotFoundError();
      if (input.groupId) {
        await assertGroupAdmin(viewerId, input.groupId, tx);
        const [member] = await tx
          .select()
          .from(groupMembers)
          .where(
            and(
              eq(groupMembers.groupId, input.groupId),
              eq(groupMembers.userId, input.placeholderId!),
              eq(groupMembers.status, "ACTIVE"),
            ),
          );
        if (!member) throw new NotFoundError();
      }
    }
    if (input.type === "PERSONAL") {
      const [existing] = await tx
        .select()
        .from(invites)
        .where(
          and(
            eq(invites.inviterId, viewerId),
            eq(invites.type, "PERSONAL"),
            isNull(invites.revokedAt),
          ),
        );
      if (existing) {
        await tx
          .update(idempotencyRecords)
          .set({ resourceId: existing.id })
          .where(
            and(
              eq(idempotencyRecords.viewerId, viewerId),
              eq(idempotencyRecords.operation, "invite"),
              eq(idempotencyRecords.key, key),
            ),
          );
        return { id: existing.id, token: tokenFor(existing.id) };
      }
    }
    const token = tokenFor(reservation.id);
    await tx.insert(invites).values({
      id: reservation.id,
      tokenHash: hash(token),
      type: input.type,
      inviterId: viewerId,
      groupId: input.groupId,
      inviteeUserId: input.placeholderId,
      maxUses: input.type === "DIRECT" ? 1 : null,
      expiresAt:
        input.type === "PERSONAL"
          ? null
          : new Date(
              Date.now() + (input.type === "GROUP_LINK" ? 14 : 30) * 86400000,
            ),
    });
    return { id: reservation.id, token };
  });
}
export async function revokeInvite(viewerId: string, id: string) {
  await db.transaction(async (tx) => {
    await assertActiveViewer(viewerId, tx);
    const [row] = await tx
      .select()
      .from(invites)
      .where(eq(invites.id, id))
      .for("update");
    if (!row) throw new NotFoundError();
    if (row.groupId) await assertGroupAdmin(viewerId, row.groupId, tx);
    else if (row.inviterId !== viewerId) throw new NotFoundError();
    await tx
      .update(invites)
      .set({ revokedAt: new Date() })
      .where(eq(invites.id, id));
  });
}
export async function previewInvite(rawToken: string) {
  const token = tokenSchema.parse(rawToken);
  const [row] = await db
    .select()
    .from(invites)
    .where(eq(invites.tokenHash, hash(token)));
  if (!row || !valid(row))
    throw new NotFoundError(
      "This invite has expired or is no longer available",
    );
  const [inviter] = await db
    .select({ name: users.name })
    .from(users)
    .where(and(eq(users.id, row.inviterId), eq(users.status, "ACTIVE")));
  if (!inviter) throw new NotFoundError();
  if (row.type === "GROUP_LINK") {
    const [group] = await db
      .select({ name: groups.name })
      .from(groups)
      .where(and(eq(groups.id, row.groupId!), isNull(groups.archivedAt)));
    if (!group) throw new NotFoundError();
    const members = await db
      .select({ id: groupMembers.userId })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, row.groupId!),
          eq(groupMembers.status, "ACTIVE"),
        ),
      );
    return {
      type: row.type,
      inviterName: inviter.name,
      groupName: group.name,
      memberCount: members.length,
      placeholderName: null,
      balances: [],
      expenses: [],
    };
  }
  const [placeholder] = row.inviteeUserId
    ? await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, row.inviteeUserId))
    : [];
  const [low, high] = row.inviteeUserId
    ? orderPair(row.inviterId, row.inviteeUserId)
    : [null, null];
  const debts =
    low && high
      ? await db
          .select()
          .from(balances)
          .where(
            and(eq(balances.userLowId, low), eq(balances.userHighId, high)),
          )
      : [];
  const byCurrency = new Map<string, bigint>();
  for (const debt of debts)
    byCurrency.set(
      debt.currency,
      (byCurrency.get(debt.currency) ?? BigInt(0)) +
        (row.inviteeUserId === low ? -debt.amount : debt.amount),
    );
  const inviterParticipant = alias(
    expenseParticipants,
    "inviter_preview_participant",
  );
  const previewExpenses = row.inviteeUserId
    ? await db
        .select({
          id: expenses.id,
          description: expenses.description,
          amount: expenseParticipants.owed,
          currency: expenses.currency,
        })
        .from(expenses)
        .innerJoin(
          expenseParticipants,
          eq(expenseParticipants.expenseId, expenses.id),
        )
        .innerJoin(
          inviterParticipant,
          and(
            eq(inviterParticipant.expenseId, expenses.id),
            eq(inviterParticipant.userId, row.inviterId),
          ),
        )
        .where(
          and(
            eq(expenseParticipants.userId, row.inviteeUserId),
            isNull(expenses.deletedAt),
          ),
        )
        .orderBy(desc(expenses.date), desc(expenses.id))
        .limit(3)
    : [];
  return {
    type: row.type,
    inviterName: inviter.name,
    groupName: null,
    expenses: previewExpenses,
    memberCount: null,
    placeholderName: placeholder?.name ?? null,
    balances: [...byCurrency].map(([currency, amount]) => ({
      currency,
      net: toSafeNumber(amount),
    })),
  };
}
async function connect(tx: DbTx, viewerId: string, otherId: string) {
  await assertCanConnect(viewerId, otherId, tx);
  const [low, high] = orderPair(viewerId, otherId);
  await tx
    .insert(friendships)
    .values({ userLowId: low, userHighId: high })
    .onConflictDoNothing();
}
export async function claimGroupOrPersonalInvite(
  viewerId: string,
  rawToken: string,
) {
  const token = tokenSchema.parse(rawToken);
  return db.transaction(async (tx) => {
    await assertActiveViewer(viewerId, tx);
    const [row] = await tx
      .select()
      .from(invites)
      .where(eq(invites.tokenHash, hash(token)))
      .for("update");
    if (row?.type === "DIRECT" && row.claimedById === viewerId)
      return {
        destination: row.groupId
          ? "/groups/" + row.groupId
          : row.inviterId === viewerId
            ? "/home"
            : "/friends/" + row.inviterId,
      };
    if (!row || !valid(row))
      throw new NotFoundError(
        "This invite has expired or is no longer available",
      );
    if (row.type === "DIRECT") {
      await mergePlaceholder(viewerId, row.inviteeUserId!, tx);
      const [claimer] = await tx
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, viewerId));
      await recordActivity(tx, viewerId, {
        type: "INVITE_CLAIMED",
        recipientIds: [row.inviterId],
        metadata: {
          description: "your invitation",
          before: { placeholderId: row.inviteeUserId, inviteId: row.id },
          after: {
            userId: viewerId,
            name: claimer!.name,
            email: claimer!.email,
          },
        },
      });
      await tx
        .update(invites)
        .set({ claimedById: viewerId, claimedAt: new Date(), useCount: 1 })
        .where(eq(invites.id, row.id));
      return {
        destination: row.groupId
          ? "/groups/" + row.groupId
          : "/friends/" + row.inviterId,
      };
    }
    if (row.inviterId === viewerId && row.type === "PERSONAL")
      throw new DomainError("This is your own invitation");
    let destination = "/friends/" + row.inviterId;
    if (row.type === "GROUP_LINK") {
      const [group] = await tx
        .select()
        .from(groups)
        .where(eq(groups.id, row.groupId!))
        .for("share");
      if (!group || group.archivedAt) throw new NotFoundError();
      const members = await tx
        .select({ id: groupMembers.userId })
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, group.id),
            eq(groupMembers.status, "ACTIVE"),
          ),
        );
      for (const member of members)
        if (member.id !== viewerId)
          await assertCanConnect(viewerId, member.id, tx);
      const [membership] = await tx
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, group.id),
            eq(groupMembers.userId, viewerId),
          ),
        );
      if (membership?.status === "REMOVED")
        throw new DomainError("Ask an admin to invite you again");
      await tx
        .insert(groupMembers)
        .values({ groupId: group.id, userId: viewerId })
        .onConflictDoUpdate({
          target: [groupMembers.groupId, groupMembers.userId],
          set: { status: "ACTIVE", leftAt: null },
        });
      if (membership?.status !== "ACTIVE")
        await recordActivity(tx, viewerId, {
          type: "MEMBER_JOINED",
          groupId: group.id,
          recipientIds: [row.inviterId],
          metadata: { description: "Joined " + group.name },
        });
      destination = "/groups/" + group.id;
    } else await connect(tx, viewerId, row.inviterId);
    await tx
      .update(invites)
      .set({ useCount: row.useCount + 1 })
      .where(eq(invites.id, row.id));
    return { destination };
  });
}

export async function reportInviteClaim(
  viewerId: string,
  inviteId: string,
  raw: unknown,
  key: string,
) {
  const input = reportClaimSchema.parse(raw);
  return db.transaction(async (tx) => {
    await assertActiveViewer(viewerId, tx);
    const [invite] = await tx
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.id, inviteId),
          eq(invites.inviterId, viewerId),
          eq(invites.type, "DIRECT"),
        ),
      )
      .for("update");
    if (!invite?.claimedById) throw new NotFoundError();
    const reservation = await reserveIdempotency(
      tx,
      viewerId,
      "invite-report",
      key,
      { inviteId, ...input },
    );
    if (reservation.replayed) return reservation.id;
    const [existing] = await tx
      .select()
      .from(inviteClaimReports)
      .where(eq(inviteClaimReports.inviteId, inviteId));
    if (existing) {
      await tx
        .update(idempotencyRecords)
        .set({ resourceId: existing.id })
        .where(
          and(
            eq(idempotencyRecords.viewerId, viewerId),
            eq(idempotencyRecords.operation, "invite-report"),
            eq(idempotencyRecords.key, key),
          ),
        );
      return existing.id;
    }
    await tx.insert(inviteClaimReports).values({
      id: reservation.id,
      inviteId,
      reporterId: viewerId,
      reason: input.reason,
    });
    return reservation.id;
  });
}
