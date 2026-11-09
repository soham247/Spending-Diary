import "server-only";
import type { z } from "zod";
import {
  activityListSchema,
  claimActivityDetailsSchema,
} from "@/lib/validation/activity";
import { and, eq, desc, lt, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db/client";
import {
  activities,
  activityRecipients,
  users,
  settlements,
} from "@/lib/db/schema";
import { assertGroupMember } from "@/lib/auth/guards";
export async function listActivity(
  viewerId: string,
  raw: z.infer<typeof activityListSchema>,
) {
  const input = activityListSchema.parse(raw);
  if (input.groupId) await assertGroupMember(viewerId, input.groupId);
  const filter = and(
    eq(activityRecipients.userId, viewerId),
    input.groupId ? eq(activities.groupId, input.groupId) : undefined,
    input.expenseId ? eq(activities.expenseId, input.expenseId) : undefined,
  );
  const [anchor] = input.cursor
    ? await db
        .select({ id: activities.id, createdAt: activities.createdAt })
        .from(activities)
        .innerJoin(
          activityRecipients,
          eq(activityRecipients.activityId, activities.id),
        )
        .where(and(filter, eq(activities.id, input.cursor)))
    : [];
  if (input.cursor && !anchor) return { items: [], nextCursor: null };
  const payer = alias(users, "activity_payer");
  const receiver = alias(users, "activity_receiver");
  const rows = await db
    .select({
      id: activities.id,
      actorName: users.name,
      type: activities.type,
      actorId: activities.actorId,
      expenseId: activities.expenseId,
      settlementId: activities.settlementId,
      groupId: activities.groupId,
      metadata: activities.metadata,
      createdAt: activities.createdAt,
      readAt: activityRecipients.readAt,
      fromName: payer.name,
      toName: receiver.name,
      paymentNote: settlements.note,
    })
    .from(activityRecipients)
    .innerJoin(activities, eq(activities.id, activityRecipients.activityId))
    .innerJoin(users, eq(users.id, activities.actorId))
    .leftJoin(settlements, eq(settlements.id, activities.settlementId))
    .leftJoin(payer, eq(payer.id, settlements.fromUserId))
    .leftJoin(receiver, eq(receiver.id, settlements.toUserId))
    .where(
      and(
        filter,
        anchor
          ? or(
              lt(activities.createdAt, anchor.createdAt),
              and(
                eq(activities.createdAt, anchor.createdAt),
                lt(activities.id, anchor.id),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(desc(activities.createdAt), desc(activities.id))
    .limit(31);
  return {
    items: rows.slice(0, 30).map((row) => ({
      ...row,
      ...(row.type === "INVITE_CLAIMED"
        ? {
            metadata: {
              description: "your invitation",
              before:
                claimActivityDetailsSchema.safeParse(row.metadata).data
                  ?.before ?? {},
              after: { name: row.actorName },
            },
          }
        : {}),
      canReportClaim: row.type === "INVITE_CLAIMED" && row.actorId !== viewerId,
    })),
    nextCursor: rows.length > 30 ? rows[29]!.id : null,
  };
}
