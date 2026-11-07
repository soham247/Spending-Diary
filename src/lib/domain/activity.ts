import "server-only";
import type { z } from "zod";
import { activityMetadataSchema as metadataSchema } from "@/lib/validation/activity";
import { and, eq } from "drizzle-orm";
import { db, type DbTx } from "@/lib/db/client";
import { activities, activityRecipients, groupMembers } from "@/lib/db/schema";
import { assertActiveViewer } from "@/lib/auth/guards";
import { NotFoundError } from "@/lib/utils/errors";
export async function recordActivity(
  tx: DbTx,
  actorId: string,
  input: {
    type: typeof activities.$inferInsert.type;
    groupId?: string | null;
    expenseId?: string;
    settlementId?: string;
    metadata: z.infer<typeof metadataSchema>;
    recipientIds: string[];
  },
) {
  const metadata = metadataSchema.parse(input.metadata);
  const [event] = await tx
    .insert(activities)
    .values({
      actorId,
      type: input.type,
      groupId: input.groupId,
      expenseId: input.expenseId,
      settlementId: input.settlementId,
      metadata,
    })
    .returning();
  const members = input.groupId
    ? await tx
        .select({ userId: groupMembers.userId })
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, input.groupId),
            eq(groupMembers.status, "ACTIVE"),
          ),
        )
    : [];
  const recipients = [
    ...new Set([
      actorId,
      ...input.recipientIds,
      ...members.map((m) => m.userId),
    ]),
  ];
  await tx.insert(activityRecipients).values(
    recipients.map((userId) => ({
      activityId: event!.id,
      userId,
      readAt: userId === actorId ? new Date() : null,
    })),
  );
  return event!.id;
}
export async function markActivityRead(viewerId: string, id: string) {
  await db.transaction(async (tx) => {
    await assertActiveViewer(viewerId, tx);
    const [row] = await tx
      .update(activityRecipients)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(activityRecipients.activityId, id),
          eq(activityRecipients.userId, viewerId),
        ),
      )
      .returning();
    if (!row) throw new NotFoundError();
  });
}
