import "server-only";
import { and, eq, inArray, or, isNull } from "drizzle-orm";
import type { DbTx } from "@/lib/db/client";
import {
  users,
  expenseParticipants,
  expenses,
  groupMembers,
  contacts,
  friendships,
  ledgerEntries,
  settlements,
  balances,
  activityRecipients,
} from "@/lib/db/schema";
import { assertActiveViewer, assertCanConnect } from "@/lib/auth/guards";
import { orderPair } from "@/lib/utils/order-pair";
import { NotFoundError } from "@/lib/utils/errors";

export async function mergePlaceholder(
  viewerId: string,
  placeholderId: string,
  tx: DbTx,
) {
  const people = await tx
    .select()
    .from(users)
    .where(inArray(users.id, [placeholderId, viewerId]))
    .orderBy(users.id)
    .for("update");
  await assertActiveViewer(viewerId, tx);
  const placeholder = people.find((p) => p.id === placeholderId);
  if (
    !placeholder ||
    placeholder.status !== "INVITED" ||
    placeholder.mergedIntoId ||
    placeholderId === viewerId
  )
    throw new NotFoundError();
  const payments = await tx
    .select()
    .from(settlements)
    .where(
      or(
        eq(settlements.fromUserId, placeholderId),
        eq(settlements.toUserId, placeholderId),
      ),
    )
    .for("update");
  const collapsedPayments = new Set(
    payments
      .filter((p) => p.fromUserId === viewerId || p.toUserId === viewerId)
      .map((p) => p.id),
  );
  const memberships = await tx
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.userId, placeholderId));
  for (const membership of memberships) {
    const [current] = await tx
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, membership.groupId),
          eq(groupMembers.userId, viewerId),
        ),
      );
    if (current) continue;
    const peers = await tx
      .select({ id: groupMembers.userId })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, membership.groupId),
          eq(groupMembers.status, "ACTIVE"),
        ),
      );
    for (const peer of peers)
      if (peer.id !== placeholderId && peer.id !== viewerId)
        await assertCanConnect(viewerId, peer.id, tx);
  }
  const participants = await tx
    .select()
    .from(expenseParticipants)
    .where(eq(expenseParticipants.userId, placeholderId));
  const affectedExpenseIds = participants.map((p) => p.expenseId).sort();
  if (affectedExpenseIds.length)
    await tx
      .select()
      .from(expenses)
      .where(inArray(expenses.id, affectedExpenseIds))
      .orderBy(expenses.id)
      .for("update");
  for (const participant of participants) {
    const [existing] = await tx
      .select()
      .from(expenseParticipants)
      .where(
        and(
          eq(expenseParticipants.expenseId, participant.expenseId),
          eq(expenseParticipants.userId, viewerId),
        ),
      );
    if (existing) {
      await tx
        .update(expenseParticipants)
        .set({
          paid: existing.paid + participant.paid,
          owed: existing.owed + participant.owed,
          splitInput: null,
        })
        .where(
          and(
            eq(expenseParticipants.expenseId, participant.expenseId),
            eq(expenseParticipants.userId, viewerId),
          ),
        );
      await tx
        .delete(expenseParticipants)
        .where(
          and(
            eq(expenseParticipants.expenseId, participant.expenseId),
            eq(expenseParticipants.userId, placeholderId),
          ),
        );
      await tx
        .update(expenses)
        .set({ splitType: "EXACT" })
        .where(eq(expenses.id, participant.expenseId));
    } else
      await tx
        .update(expenseParticipants)
        .set({ userId: viewerId })
        .where(
          and(
            eq(expenseParticipants.expenseId, participant.expenseId),
            eq(expenseParticipants.userId, placeholderId),
          ),
        );
    await tx
      .update(expenses)
      .set({
        version:
          (
            await tx
              .select({ version: expenses.version })
              .from(expenses)
              .where(eq(expenses.id, participant.expenseId))
          )[0]!.version + 1,
      })
      .where(eq(expenses.id, participant.expenseId));
  }
  for (const membership of memberships) {
    await tx
      .insert(groupMembers)
      .values({ ...membership, userId: viewerId })
      .onConflictDoNothing();
    await tx
      .update(groupMembers)
      .set({ status: "LEFT", leftAt: new Date() })
      .where(
        and(
          eq(groupMembers.groupId, membership.groupId),
          eq(groupMembers.userId, placeholderId),
        ),
      );
  }
  for (const contact of await tx
    .select()
    .from(contacts)
    .where(eq(contacts.userId, placeholderId))) {
    if (contact.ownerId !== viewerId)
      await tx
        .insert(contacts)
        .values({ ...contact, userId: viewerId })
        .onConflictDoNothing();
  }
  const pairs = await tx
    .select()
    .from(friendships)
    .where(
      or(
        eq(friendships.userLowId, placeholderId),
        eq(friendships.userHighId, placeholderId),
      ),
    );
  for (const pair of pairs) {
    const other =
      pair.userLowId === placeholderId ? pair.userHighId : pair.userLowId;
    if (other === viewerId) continue;
    const [low, high] = orderPair(viewerId, other);
    const [existing] = await tx
      .select()
      .from(friendships)
      .where(
        and(eq(friendships.userLowId, low), eq(friendships.userHighId, high)),
      )
      .for("update");
    if (!existing)
      await tx.insert(friendships).values({
        userLowId: low,
        userHighId: high,
        status: pair.status,
        blockedById:
          pair.blockedById === placeholderId ? viewerId : pair.blockedById,
      });
    else if (pair.status === "BLOCKED" && existing.status !== "BLOCKED")
      await tx
        .update(friendships)
        .set({
          status: "BLOCKED",
          blockedById:
            pair.blockedById === placeholderId ? viewerId : pair.blockedById,
        })
        .where(
          and(eq(friendships.userLowId, low), eq(friendships.userHighId, high)),
        );
  }
  await tx
    .delete(friendships)
    .where(
      or(
        eq(friendships.userLowId, placeholderId),
        eq(friendships.userHighId, placeholderId),
      ),
    );
  await tx.delete(contacts).where(eq(contacts.userId, placeholderId));
  const recipients = await tx
    .select()
    .from(activityRecipients)
    .where(eq(activityRecipients.userId, placeholderId));
  for (const recipient of recipients)
    await tx
      .insert(activityRecipients)
      .values({ ...recipient, userId: viewerId })
      .onConflictDoNothing();
  await tx
    .delete(activityRecipients)
    .where(eq(activityRecipients.userId, placeholderId));
  const entries = await tx
    .select()
    .from(ledgerEntries)
    .where(
      or(
        eq(ledgerEntries.debtorId, placeholderId),
        eq(ledgerEntries.creditorId, placeholderId),
      ),
    )
    .orderBy(ledgerEntries.id)
    .for("update");
  for (const entry of entries) {
    const debtorId =
      entry.debtorId === placeholderId ? viewerId : entry.debtorId;
    const creditorId =
      entry.creditorId === placeholderId ? viewerId : entry.creditorId;
    await tx
      .update(ledgerEntries)
      .set(
        debtorId === creditorId ||
          (entry.settlementId !== null &&
            collapsedPayments.has(entry.settlementId))
          ? { voidedAt: entry.voidedAt ?? new Date() }
          : { debtorId, creditorId },
      )
      .where(eq(ledgerEntries.id, entry.id));
  }
  for (const payment of payments)
    await tx
      .update(settlements)
      .set(
        collapsedPayments.has(payment.id)
          ? { deletedAt: payment.deletedAt ?? new Date() }
          : {
              fromUserId:
                payment.fromUserId === placeholderId
                  ? viewerId
                  : payment.fromUserId,
              toUserId:
                payment.toUserId === placeholderId
                  ? viewerId
                  : payment.toUserId,
            },
      )
      .where(eq(settlements.id, payment.id));
  await tx
    .delete(balances)
    .where(
      or(
        inArray(balances.userLowId, [placeholderId, viewerId]),
        inArray(balances.userHighId, [placeholderId, viewerId]),
      ),
    );
  const active = await tx
    .select()
    .from(ledgerEntries)
    .where(
      and(
        isNull(ledgerEntries.voidedAt),
        or(
          eq(ledgerEntries.debtorId, viewerId),
          eq(ledgerEntries.creditorId, viewerId),
        ),
      ),
    );
  const totals = new Map<string, typeof balances.$inferInsert>();
  for (const entry of active) {
    const [low, high] = orderPair(entry.debtorId, entry.creditorId);
    const key = [entry.scopeId, low, high, entry.currency].join("\0");
    const row = totals.get(key) ?? {
      scopeId: entry.scopeId,
      userLowId: low,
      userHighId: high,
      currency: entry.currency,
      amount: BigInt(0),
    };
    row.amount +=
      entry.debtorId === low ? BigInt(entry.amount) : -BigInt(entry.amount);
    totals.set(key, row);
  }
  for (const row of [...totals.values()].sort((a, b) =>
    [a.scopeId, a.userLowId, a.userHighId, a.currency]
      .join("\0")
      .localeCompare(
        [b.scopeId, b.userLowId, b.userHighId, b.currency].join("\0"),
      ),
  ))
    await tx.insert(balances).values(row);
  await tx
    .update(users)
    .set({ status: "DELETED", mergedIntoId: viewerId, deletedAt: new Date() })
    .where(eq(users.id, placeholderId));
}
