import "server-only";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "@/lib/db/client";
import type { DbTx } from "@/lib/db/client";
import { settlements } from "@/lib/db/schema";
import { writeLedgerEntries, voidLedgerEntries } from "./ledger";

export type SettlementMethod = "CASH" | "UPI" | "OTHER";

export interface CreateSettlementInput {
  groupId?: string | null;
  /** User who paid (reduces their debt) */
  fromUserId: string;
  /** User who received payment */
  toUserId: string;
  amount: number;       // minor units — must be > 0
  currency: string;
  method: SettlementMethod;
  date: string;         // YYYY-MM-DD
  note?: string | null;
  createdById: string;
  idempotencyKey?: string | null;
}

function scopeId(groupId: string | null | undefined): string {
  return groupId ?? "direct";
}

/**
 * Record a settlement payment and update balances.
 * fromUserId paid toUserId → fromUserId was the debtor, toUserId the creditor.
 */
export async function createSettlement(
  input: CreateSettlementInput,
): Promise<string> {
  return db.transaction(async (tx) => createSettlementTx(tx, input));
}

export async function createSettlementTx(
  tx: DbTx,
  input: CreateSettlementInput,
): Promise<string> {
  if (input.amount <= 0) {
    throw Object.assign(new Error("Settlement amount must be positive"), {
      code: "INVALID_INPUT",
    });
  }
  if (input.fromUserId === input.toUserId) {
    throw Object.assign(new Error("From and to users must be different"), {
      code: "INVALID_INPUT",
    });
  }

  const settlementId = createId();

  await tx.insert(settlements).values({
    id: settlementId,
    groupId: input.groupId ?? null,
    fromUserId: input.fromUserId,
    toUserId: input.toUserId,
    amount: input.amount,
    currency: input.currency,
    method: input.method,
    date: input.date,
    note: input.note ?? null,
    createdById: input.createdById,
    idempotencyKey: input.idempotencyKey ?? null,
  });

  // fromUserId paid toUserId → fromUserId is the debtor, toUserId is the creditor
  await writeLedgerEntries(
    tx,
    [{ debtorId: input.fromUserId, creditorId: input.toUserId, amount: input.amount }],
    scopeId(input.groupId),
    input.currency,
    { settlementId },
  );

  return settlementId;
}

/**
 * Soft-delete a settlement and reverse its ledger entries.
 */
export async function deleteSettlement(settlementId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: settlements.id, deletedAt: settlements.deletedAt })
      .from(settlements)
      .where(eq(settlements.id, settlementId));

    if (!row || row.deletedAt) {
      throw Object.assign(new Error("Settlement not found"), { code: "NOT_FOUND" });
    }

    await voidLedgerEntries(tx, { settlementId });

    await tx
      .update(settlements)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(settlements.id, settlementId));
  });
}
