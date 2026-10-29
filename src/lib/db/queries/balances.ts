import "server-only";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { balances, settlements } from "@/lib/db/schema";
import { orderPair } from "@/lib/utils/order-pair";

/** Get all non-zero balances for the viewer across all scopes. */
export async function getOverallBalances(viewerId: string) {
  const rows = await db
    .select()
    .from(balances)
    .where(
      or(eq(balances.userLowId, viewerId), eq(balances.userHighId, viewerId)),
    );
  return rows.filter((r) => r.amount !== BigInt(0));
}

/** Get balances for the viewer within a specific group. */
export async function getGroupBalances(viewerId: string, groupId: string) {
  const rows = await db
    .select()
    .from(balances)
    .where(
      and(
        eq(balances.scopeId, groupId),
        or(eq(balances.userLowId, viewerId), eq(balances.userHighId, viewerId)),
      ),
    );
  return rows.filter((r) => r.amount !== BigInt(0));
}

/** Get the balance between exactly two users in the "direct" scope. */
export async function getFriendBalance(viewerId: string, otherId: string) {
  const [lowId, highId] = orderPair(viewerId, otherId);
  const [row] = await db
    .select()
    .from(balances)
    .where(
      and(
        eq(balances.scopeId, "direct"),
        eq(balances.userLowId, lowId),
        eq(balances.userHighId, highId),
      ),
    );
  return row ?? null;
}

/** List non-deleted settlements involving the viewer. */
export async function getSettlements(viewerId: string, groupId?: string) {
  const rows = await db
    .select()
    .from(settlements)
    .where(
      and(
        groupId ? eq(settlements.groupId, groupId) : isNull(settlements.groupId),
        isNull(settlements.deletedAt),
        or(
          eq(settlements.fromUserId, viewerId),
          eq(settlements.toUserId, viewerId),
        ),
      ),
    )
    .orderBy(desc(settlements.date), desc(settlements.createdAt));
  return rows;
}
