import "server-only";
import { and, eq } from "drizzle-orm";
import { db, type DbTx } from "@/lib/db/client";
import { expenses, expenseParticipants } from "@/lib/db/schema";
import { assertCanEditExpense, assertExpenseParticipants } from "@/lib/auth/guards";
import { createExpenseSchema, editExpenseSchema, type CreateExpenseInput, type EditExpenseInput } from "@/lib/validation/expense";
import { ConflictError, DomainError, NotFoundError } from "@/lib/utils/errors";
import { splitEqual, splitExact, splitPercentage, splitShares, computeLedgerEdges } from "./splits";
import { writeLedgerEntries, voidLedgerEntries } from "./ledger";
import { reserveIdempotency } from "./idempotency";

export type { CreateExpenseInput, EditExpenseInput };
export type SplitType = CreateExpenseInput["splitType"];
export type ParticipantInput = NonNullable<EditExpenseInput["participants"]>[number];

function resolveOwed(input: CreateExpenseInput): Map<string, number> {
  try {
    switch (input.splitType) {
      case "EQUAL": return splitEqual(input.participants.map(p => p.userId), input.amount);
      case "EXACT": return splitExact(input.participants, input.amount);
      case "PERCENTAGE": return splitPercentage(input.participants, input.amount);
      case "SHARES": return splitShares(input.participants, input.amount);
    }
  } catch (error) {
    throw new DomainError(error instanceof Error ? error.message : "Invalid split");
  }
}
function participantRows(expenseId: string, input: CreateExpenseInput) {
  const owed = resolveOwed(input);
  return input.participants.map(p => ({
    expenseId, userId: p.userId, paid: p.paid, owed: owed.get(p.userId)!,
    splitInput: "percentage" in p ? String(p.percentage) : "shares" in p ? String(p.shares) : null,
  }));
}
export async function createExpense(viewerId: string, raw: CreateExpenseInput, key: string): Promise<string> {
  const input = createExpenseSchema.parse(raw);
  return db.transaction(tx => createExpenseTx(viewerId, tx, input, key));
}
export async function createExpenseTx(viewerId: string, tx: DbTx, input: CreateExpenseInput, key: string) {
  const groupId = input.groupId ?? null;
  await assertExpenseParticipants(viewerId, groupId, input.participants.map(p => p.userId), input.currency, tx);
  const reservation = await reserveIdempotency(tx, viewerId, "expense", key, { ...input, groupId, notes: input.notes ?? null });
  if (reservation.replayed) return reservation.id;
  const [legacy] = await tx.select({ id: expenses.id }).from(expenses).where(and(eq(expenses.createdById, viewerId), eq(expenses.idempotencyKey, key)));
  if (legacy) throw new ConflictError("This key predates request-digest tracking; use a new key");
  const id = reservation.id;
  await tx.insert(expenses).values({
    ...input, id, groupId, kind: groupId || input.participants.length > 1 ? "SHARED" : "PERSONAL",
    createdById: viewerId, idempotencyKey: key, notes: input.notes ?? null,
  });
  const rows = participantRows(id, input);
  await tx.insert(expenseParticipants).values(rows);
  await writeLedgerEntries(tx, computeLedgerEdges(rows), groupId ?? "direct", input.currency, { expenseId: id });
  return id;
}
async function lockedExpense(tx: DbTx, id: string) {
  const [expense] = await tx.select().from(expenses).where(eq(expenses.id, id)).for("update");
  if (!expense) throw new NotFoundError();
  return expense;
}
export async function editExpense(viewerId: string, expenseId: string, raw: EditExpenseInput): Promise<void> {
  const input = editExpenseSchema.parse(raw);
  await db.transaction(async tx => {
    const row = await lockedExpense(tx, expenseId);
    await assertCanEditExpense(viewerId, row, tx);
    if (row.deletedAt) throw new NotFoundError();
    if (row.version !== input.version) throw new ConflictError("Expense changed; reload before saving");
    const financial = input.participants !== undefined || input.amount !== undefined || input.currency !== undefined || input.splitType !== undefined;
    const oldParticipants = await tx.select().from(expenseParticipants).where(eq(expenseParticipants.expenseId, expenseId));
    const merged = createExpenseSchema.parse({
      ...row, ...input,
      participants: input.participants ?? oldParticipants.map(p => ({
        userId: p.userId, paid: p.paid, owed: p.owed,
        ...(row.splitType === "PERCENTAGE" ? { percentage: Number(p.splitInput) } : {}),
        ...(row.splitType === "SHARES" ? { shares: Number(p.splitInput) } : {}),
      })),
    });
    if (financial) {
      await assertExpenseParticipants(viewerId, row.groupId, merged.participants.map(p => p.userId), merged.currency, tx);
      const rows = participantRows(expenseId, merged);
      await voidLedgerEntries(tx, { expenseId });
      await tx.delete(expenseParticipants).where(eq(expenseParticipants.expenseId, expenseId));
      await tx.insert(expenseParticipants).values(rows);
      await writeLedgerEntries(tx, computeLedgerEdges(rows), row.groupId ?? "direct", merged.currency, { expenseId });
    }
    await tx.update(expenses).set({
      description: merged.description, category: merged.category, notes: merged.notes,
      amount: merged.amount, currency: merged.currency, splitType: merged.splitType, date: merged.date,
      version: row.version + 1, updatedAt: new Date(),
    }).where(and(eq(expenses.id, expenseId), eq(expenses.version, input.version)));
  });
}
export async function deleteExpense(viewerId: string, expenseId: string): Promise<void> {
  await db.transaction(async tx => {
    const row = await lockedExpense(tx, expenseId);
    await assertCanEditExpense(viewerId, row, tx);
    if (row.deletedAt) throw new NotFoundError();
    await voidLedgerEntries(tx, { expenseId });
    await tx.update(expenses).set({ deletedAt: new Date(), version: row.version + 1, updatedAt: new Date() }).where(eq(expenses.id, expenseId));
  });
}
export async function restoreExpense(viewerId: string, expenseId: string): Promise<void> {
  await db.transaction(async tx => {
    const row = await lockedExpense(tx, expenseId);
    await assertCanEditExpense(viewerId, row, tx);
    if (!row.deletedAt) throw new NotFoundError();
    const rows = await tx.select().from(expenseParticipants).where(eq(expenseParticipants.expenseId, expenseId));
    await assertExpenseParticipants(viewerId, row.groupId, rows.map(p => p.userId), row.currency, tx);
    await writeLedgerEntries(tx, computeLedgerEdges(rows), row.groupId ?? "direct", row.currency, { expenseId });
    await tx.update(expenses).set({ deletedAt: null, version: row.version + 1, updatedAt: new Date() }).where(eq(expenses.id, expenseId));
  });
}
