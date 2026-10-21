import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { DbTx } from "@/lib/db/client";
import {
  ledgerEntries,
  balances,
} from "@/lib/db/schema";
import { orderPair } from "@/lib/utils/order-pair";
import type { LedgerEdge } from "./splits";

/**
 * Write ledger entries and update the balance cache atomically.
 * Must be called inside a db.transaction().
 *
 * @param tx       - The transaction handle
 * @param edges    - Directed debt edges from computeLedgerEdges()
 * @param scopeId  - Group ID or "direct"
 * @param currency - ISO 4217 currency code
 * @param sourceId - { expenseId } or { settlementId }
 */
export async function writeLedgerEntries(
  tx: DbTx,
  edges: LedgerEdge[],
  scopeId: string,
  currency: string,
  sourceId: { expenseId: string } | { settlementId: string },
): Promise<void> {
  if (edges.length === 0) return;

  // Insert ledger entries
  await tx.insert(ledgerEntries).values(
    edges.map((edge) => ({
      scopeId,
      debtorId: edge.debtorId,
      creditorId: edge.creditorId,
      amount: edge.amount,
      currency,
      ...("expenseId" in sourceId
        ? { expenseId: sourceId.expenseId }
        : { settlementId: sourceId.settlementId }),
    })),
  );

  // Update balance cache for each edge
  for (const edge of edges) {
    const [lowId, highId] = orderPair(edge.debtorId, edge.creditorId);
    // Positive amount means lowId owes highId; negative means highId owes lowId.
    const delta =
      edge.debtorId === lowId ? BigInt(edge.amount) : BigInt(-edge.amount);

    await tx
      .insert(balances)
      .values({
        scopeId,
        userLowId: lowId,
        userHighId: highId,
        currency,
        amount: delta,
      })
      .onConflictDoUpdate({
        target: [
          balances.scopeId,
          balances.userLowId,
          balances.userHighId,
          balances.currency,
        ],
        set: {
          amount: sql`${balances.amount} + ${delta}`,
          updatedAt: new Date(),
        },
      });
  }
}

/**
 * Void all non-voided ledger entries for a given expense or settlement,
 * and reverse their effect on the balance cache.
 * Must be called inside a db.transaction().
 */
export async function voidLedgerEntries(
  tx: DbTx,
  sourceId: { expenseId: string } | { settlementId: string },
): Promise<void> {
  const filter =
    "expenseId" in sourceId
      ? and(
          eq(ledgerEntries.expenseId, sourceId.expenseId),
          isNull(ledgerEntries.voidedAt),
        )
      : and(
          eq(ledgerEntries.settlementId, sourceId.settlementId),
          isNull(ledgerEntries.voidedAt),
        );

  // Fetch entries to reverse
  const rows = await tx
    .select()
    .from(ledgerEntries)
    .where(filter);

  if (rows.length === 0) return;

  // Mark voided
  await tx
    .update(ledgerEntries)
    .set({ voidedAt: new Date() })
    .where(filter);

  // Reverse each entry in the balance cache
  for (const row of rows) {
    const [lowId, highId] = orderPair(row.debtorId, row.creditorId);
    const delta =
      row.debtorId === lowId ? BigInt(-row.amount) : BigInt(row.amount);

    await tx
      .insert(balances)
      .values({
        scopeId: row.scopeId,
        userLowId: lowId,
        userHighId: highId,
        currency: row.currency,
        amount: delta,
      })
      .onConflictDoUpdate({
        target: [
          balances.scopeId,
          balances.userLowId,
          balances.userHighId,
          balances.currency,
        ],
        set: {
          amount: sql`${balances.amount} + ${delta}`,
          updatedAt: new Date(),
        },
      });
  }
}
