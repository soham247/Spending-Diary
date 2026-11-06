import "server-only";
import { recordActivity } from "./activity";
import { and, eq } from "drizzle-orm";
import { db, type DbTx } from "@/lib/db/client";
import { settlements } from "@/lib/db/schema";
import { assertBlockedSettlementDebt, assertCanDeleteSettlement, assertCanRecordSettlement } from "@/lib/auth/guards";
import { createSettlementSchema, type CreateSettlementInput } from "@/lib/validation/settlement";
import { ConflictError, DomainError, NotFoundError } from "@/lib/utils/errors";
import { writeLedgerEntries, voidLedgerEntries } from "./ledger";
import { reserveIdempotency } from "./idempotency";

export type { CreateSettlementInput };
export type SettlementMethod = CreateSettlementInput["method"];
export async function createSettlement(viewerId: string, raw: CreateSettlementInput, key: string): Promise<string> {
  const input = createSettlementSchema.parse(raw);
  return db.transaction(tx => createSettlementTx(viewerId, tx, input, key));
}
export async function createSettlementTx(viewerId: string, tx: DbTx, input: CreateSettlementInput, key: string): Promise<string> {
  if (input.fromUserId === input.toUserId) throw new DomainError("From and to users must be different");
  const groupId = input.groupId ?? null;
  const blocked = await assertCanRecordSettlement(viewerId, { ...input, groupId }, tx);
  const reservation = await reserveIdempotency(tx, viewerId, "settlement", key, { ...input, groupId, note: input.note ?? null });
  if (reservation.replayed) return reservation.id;
  const [legacy] = await tx.select({ id: settlements.id }).from(settlements).where(and(eq(settlements.createdById, viewerId), eq(settlements.idempotencyKey, key)));
  if (legacy) throw new ConflictError("This key predates request-digest tracking; use a new key");
  if (blocked) await assertBlockedSettlementDebt(viewerId, input, tx);
  const id = reservation.id;
  await tx.insert(settlements).values({ ...input, id, groupId, note: input.note ?? null, createdById: viewerId, idempotencyKey: key });
  await writeLedgerEntries(tx, [{ debtorId: input.toUserId, creditorId: input.fromUserId, amount: input.amount }], groupId ?? "direct", input.currency, { settlementId: id });
  await recordActivity(tx, viewerId, { type: "SETTLEMENT_CREATED", groupId, settlementId: id, recipientIds: [input.fromUserId, input.toUserId], metadata: { description: "Payment recorded", amount: input.amount, currency: input.currency } });
  return id;
}
export async function deleteSettlement(viewerId: string, settlementId: string): Promise<void> {
  await db.transaction(async tx => {
    const [row] = await tx.select().from(settlements).where(eq(settlements.id, settlementId)).for("update");
    if (!row) throw new NotFoundError();
    await assertCanDeleteSettlement(viewerId, row, tx);
    if (row.deletedAt) throw new NotFoundError();
    await recordActivity(tx, viewerId, { type: "SETTLEMENT_DELETED", groupId: row.groupId, settlementId, recipientIds: [row.fromUserId, row.toUserId], metadata: { description: "Payment deleted", amount: row.amount, currency: row.currency } });
    await voidLedgerEntries(tx, { settlementId });
    await tx.update(settlements).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(settlements.id, settlementId));
  });
}

export async function restoreSettlement(viewerId: string, settlementId: string): Promise<void> {
  await db.transaction(async tx => {
    const [row] = await tx.select().from(settlements).where(eq(settlements.id, settlementId)).for("update");
    if (!row) throw new NotFoundError();
    await assertCanDeleteSettlement(viewerId, row, tx);
    if (!row.deletedAt) throw new NotFoundError();
    const blocked = await assertCanRecordSettlement(viewerId, row, tx);
    if (blocked) await assertBlockedSettlementDebt(viewerId, row, tx);
    await writeLedgerEntries(tx, [{ debtorId: row.toUserId, creditorId: row.fromUserId, amount: row.amount }], row.groupId ?? "direct", row.currency, { settlementId });
    await tx.update(settlements).set({ deletedAt: null, updatedAt: new Date() }).where(eq(settlements.id, settlementId));
    await recordActivity(tx, viewerId, { type: "SETTLEMENT_CREATED", groupId: row.groupId, settlementId, recipientIds: [row.fromUserId, row.toUserId], metadata: { description: "Payment restored", amount: row.amount, currency: row.currency } });
  });
}
