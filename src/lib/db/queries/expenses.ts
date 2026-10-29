import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { expenses, expenseParticipants } from "@/lib/db/schema";

/** Fetch a single expense visible to viewerId — either they created it or they participate. */
export async function getExpenseById(viewerId: string, expenseId: string) {
  const [row] = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, expenseId), isNull(expenses.deletedAt)));

  if (!row) return null;

  // Authorization: viewer must be a participant or the creator
  const participants = await db
    .select()
    .from(expenseParticipants)
    .where(eq(expenseParticipants.expenseId, expenseId));

  const isParticipant = participants.some((p) => p.userId === viewerId);
  if (!isParticipant && row.createdById !== viewerId) return null;

  return { ...row, participants };
}

/** List non-deleted expenses for a group, most recent first. */
export async function getGroupExpenses(
  viewerId: string,
  groupId: string,
  limit = 50,
  cursor?: string,
) {
  // viewerId scoping is handled by assertGroupMember in the route
  const rows = await db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.groupId, groupId),
        isNull(expenses.deletedAt),
        cursor ? desc(expenses.createdAt) : undefined,
      ),
    )
    .orderBy(desc(expenses.date), desc(expenses.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  return {
    items: hasMore ? rows.slice(0, limit) : rows,
    nextCursor: hasMore ? rows[limit - 1]?.id : null,
  };
}
