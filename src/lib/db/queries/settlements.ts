import "server-only";
import { and, desc, eq, isNull, isNotNull, lt, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db/client";
import { settlements, groups, groupMembers, users } from "@/lib/db/schema";
import {
  settlementListSchema,
  type SettlementListInput,
} from "@/lib/validation/settlement";
export async function listSettlements(
  viewerId: string,
  raw: SettlementListInput = {},
) {
  const input = settlementListSchema.parse(raw);
  const membership = alias(groupMembers, "settlement_viewer");
  const from = alias(users, "settlement_from");
  const to = alias(users, "settlement_to");
  const filter = and(
    or(
      eq(settlements.fromUserId, viewerId),
      eq(settlements.toUserId, viewerId),
      eq(membership.status, "ACTIVE"),
    ),
    input.groupId ? eq(settlements.groupId, input.groupId) : undefined,
    input.friendId
      ? or(
          and(
            eq(settlements.fromUserId, viewerId),
            eq(settlements.toUserId, input.friendId),
          ),
          and(
            eq(settlements.toUserId, viewerId),
            eq(settlements.fromUserId, input.friendId),
          ),
        )
      : undefined,
    input.deleted === "true"
      ? isNotNull(settlements.deletedAt)
      : isNull(settlements.deletedAt),
  );
  const base = () =>
    db
      .select({
        payment: settlements,
        fromName: from.name,
        toName: to.name,
        memberStatus: membership.status,
        archivedAt: groups.archivedAt,
      })
      .from(settlements)
      .leftJoin(
        membership,
        and(
          eq(membership.groupId, settlements.groupId),
          eq(membership.userId, viewerId),
        ),
      )
      .leftJoin(groups, eq(groups.id, settlements.groupId))
      .innerJoin(from, eq(from.id, settlements.fromUserId))
      .innerJoin(to, eq(to.id, settlements.toUserId));
  const [anchor] = input.cursor
    ? await base().where(and(filter, eq(settlements.id, input.cursor)))
    : [];
  if (input.cursor && !anchor) return { items: [], nextCursor: null };
  const rows = await base()
    .where(
      and(
        filter,
        anchor
          ? or(
              lt(settlements.date, anchor.payment.date),
              and(
                eq(settlements.date, anchor.payment.date),
                lt(settlements.id, anchor.payment.id),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(desc(settlements.date), desc(settlements.id))
    .limit(31);
  return {
    items: rows.slice(0, 30).map((row) => ({
      ...row.payment,
      fromName: row.fromName,
      toName: row.toName,
      canEdit:
        (row.payment.fromUserId === viewerId ||
          row.payment.toUserId === viewerId) &&
        !row.archivedAt,
    })),
    nextCursor: rows.length > 30 ? rows[29]!.payment.id : null,
  };
}
