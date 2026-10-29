import "server-only";
import { and, desc, eq, exists, isNull, lt, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { expenses, expenseParticipants, groupMembers } from "@/lib/db/schema";
import { ValidationError } from "@/lib/utils/errors";

function visible(viewerId: string) {
  return or(
    exists(db.select({ id: expenseParticipants.userId }).from(expenseParticipants).where(and(eq(expenseParticipants.expenseId, expenses.id), eq(expenseParticipants.userId, viewerId)))),
    exists(db.select({ id: groupMembers.userId }).from(groupMembers).where(and(eq(groupMembers.groupId, expenses.groupId), eq(groupMembers.userId, viewerId), eq(groupMembers.status, "ACTIVE")))),
  );
}
export async function getExpenseById(viewerId: string, expenseId: string) {
  const [row] = await db.select().from(expenses).where(and(eq(expenses.id, expenseId), isNull(expenses.deletedAt), visible(viewerId)));
  if (!row) return null;
  const participants = await db.select().from(expenseParticipants).where(eq(expenseParticipants.expenseId, expenseId));
  return { ...row, participants };
}
export async function getGroupExpenses(viewerId: string, groupId: string, limit = 30, cursor?: string) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new ValidationError("Invalid page size");
  const [anchor] = cursor ? await db.select().from(expenses).where(and(eq(expenses.id, cursor), eq(expenses.groupId, groupId), isNull(expenses.deletedAt), visible(viewerId))) : [];
  if (cursor && !anchor) return { items: [], nextCursor: null };
  const rows = await db.select().from(expenses).where(and(
    eq(expenses.groupId, groupId), isNull(expenses.deletedAt), visible(viewerId),
    anchor ? or(lt(expenses.date, anchor.date), and(eq(expenses.date, anchor.date), lt(expenses.id, anchor.id))) : undefined,
  )).orderBy(desc(expenses.date), desc(expenses.id)).limit(limit + 1);
  return { items: rows.slice(0, limit), nextCursor: rows.length > limit ? rows[limit - 1]!.id : null };
}
