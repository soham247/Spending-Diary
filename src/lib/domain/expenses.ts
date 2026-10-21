import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "@/lib/db/client";
import type { DbTx } from "@/lib/db/client";
import {
  expenses,
  expenseParticipants,
} from "@/lib/db/schema";
import {
  splitEqual,
  splitExact,
  splitPercentage,
  splitShares,
  computeLedgerEdges,
} from "./splits";
import { writeLedgerEntries, voidLedgerEntries } from "./ledger";

// ─── Input types ─────────────────────────────────────────────────────

export type SplitType = "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";

export interface ParticipantInput {
  userId: string;
  paid: number;           // minor units
  owed?: number;          // EXACT only
  percentage?: number;    // PERCENTAGE only
  shares?: number;        // SHARES only
}

export interface CreateExpenseInput {
  groupId?: string | null;
  description: string;
  category: string;
  notes?: string | null;
  amount: number;         // minor units
  currency: string;
  splitType: SplitType;
  date: string;           // YYYY-MM-DD
  createdById: string;
  participants: ParticipantInput[];
  idempotencyKey?: string | null;
}

export interface EditExpenseInput {
  expenseId: string;
  version: number;        // optimistic concurrency
  description?: string;
  category?: string;
  notes?: string | null;
  amount?: number;
  currency?: string;
  splitType?: SplitType;
  date?: string;
  participants?: ParticipantInput[];
}

// ─── Helpers ─────────────────────────────────────────────────────────

function resolveOwed(
  participants: ParticipantInput[],
  splitType: SplitType,
  total: number,
): Map<string, number> {
  switch (splitType) {
    case "EQUAL":
      return splitEqual(participants.map((p) => p.userId), total);

    case "EXACT":
      return splitExact(
        participants.map((p) => ({ userId: p.userId, owed: p.owed ?? 0 })),
        total,
      );

    case "PERCENTAGE":
      return splitPercentage(
        participants.map((p) => ({
          userId: p.userId,
          percentage: p.percentage ?? 0,
        })),
        total,
      );

    case "SHARES":
      return splitShares(
        participants.map((p) => ({
          userId: p.userId,
          shares: p.shares ?? 1,
        })),
        total,
      );
  }
}

function scopeId(groupId: string | null | undefined): string {
  return groupId ?? "direct";
}

// ─── Create ──────────────────────────────────────────────────────────

export async function createExpense(input: CreateExpenseInput) {
  return db.transaction(async (tx) => {
    return createExpenseTx(tx, input);
  });
}

export async function createExpenseTx(tx: DbTx, input: CreateExpenseInput) {
  const owedMap = resolveOwed(input.participants, input.splitType, input.amount);

  const expenseId = createId();

  await tx.insert(expenses).values({
    id: expenseId,
    groupId: input.groupId ?? null,
    kind: input.groupId ? "SHARED" : "PERSONAL",
    description: input.description,
    category: input.category,
    notes: input.notes ?? null,
    amount: input.amount,
    currency: input.currency,
    splitType: input.splitType,
    date: input.date,
    createdById: input.createdById,
    idempotencyKey: input.idempotencyKey ?? null,
    version: 1,
  });

  const participantRows = input.participants.map((p) => ({
    expenseId,
    userId: p.userId,
    paid: p.paid,
    owed: owedMap.get(p.userId) ?? 0,
    splitInput: p.percentage != null
      ? String(p.percentage)
      : p.shares != null
        ? String(p.shares)
        : null,
  }));

  await tx.insert(expenseParticipants).values(participantRows);

  const ledgerEdges = computeLedgerEdges(
    participantRows.map((r) => ({ userId: r.userId, paid: r.paid, owed: r.owed })),
  );

  await writeLedgerEntries(tx, ledgerEdges, scopeId(input.groupId), input.currency, {
    expenseId,
  });

  return expenseId;
}

// ─── Edit (optimistic concurrency) ───────────────────────────────────

export async function editExpense(input: EditExpenseInput): Promise<void> {
  await db.transaction(async (tx) => {
    // Load and version-check in same transaction
    const [row] = await tx
      .select({
        id: expenses.id,
        version: expenses.version,
        groupId: expenses.groupId,
        currency: expenses.currency,
        amount: expenses.amount,
        splitType: expenses.splitType,
        deletedAt: expenses.deletedAt,
      })
      .from(expenses)
      .where(eq(expenses.id, input.expenseId));

    if (!row || row.deletedAt) {
      throw Object.assign(new Error("Expense not found"), { code: "NOT_FOUND" });
    }
    if (row.version !== input.version) {
      throw Object.assign(
        new Error(`Version conflict: expected ${input.version}, found ${row.version}`),
        { code: "VERSION_CONFLICT" },
      );
    }

    const newAmount = input.amount ?? row.amount;
    const newCurrency = input.currency ?? row.currency;
    const newSplitType = (input.splitType ?? row.splitType) as SplitType;
    const newGroupId = row.groupId;

    // Update expense fields
    await tx
      .update(expenses)
      .set({
        description: input.description,
        category: input.category,
        notes: input.notes,
        amount: input.amount,
        currency: input.currency,
        splitType: input.splitType,
        date: input.date,
        version: row.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(expenses.id, input.expenseId));

    // If participants changed, replace them and re-derive ledger entries
    if (input.participants) {
      // Void old ledger entries and reverse balance cache
      await voidLedgerEntries(tx, { expenseId: input.expenseId });

      // Replace participants
      await tx
        .delete(expenseParticipants)
        .where(eq(expenseParticipants.expenseId, input.expenseId));

      const owedMap = resolveOwed(input.participants, newSplitType, newAmount);

      const participantRows = input.participants.map((p) => ({
        expenseId: input.expenseId,
        userId: p.userId,
        paid: p.paid,
        owed: owedMap.get(p.userId) ?? 0,
        splitInput: p.percentage != null
          ? String(p.percentage)
          : p.shares != null
            ? String(p.shares)
            : null,
      }));

      await tx.insert(expenseParticipants).values(participantRows);

      const edges = computeLedgerEdges(
        participantRows.map((r) => ({ userId: r.userId, paid: r.paid, owed: r.owed })),
      );

      await writeLedgerEntries(tx, edges, scopeId(newGroupId), newCurrency, {
        expenseId: input.expenseId,
      });
    }
  });
}

// ─── Delete (soft) ───────────────────────────────────────────────────

export async function deleteExpense(
  expenseId: string,
  viewerId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: expenses.id, deletedAt: expenses.deletedAt, createdById: expenses.createdById })
      .from(expenses)
      .where(eq(expenses.id, expenseId));

    if (!row || row.deletedAt) {
      throw Object.assign(new Error("Expense not found"), { code: "NOT_FOUND" });
    }

    // Void ledger entries and reverse balance cache
    await voidLedgerEntries(tx, { expenseId });

    await tx
      .update(expenses)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(expenses.id, expenseId));
  });
}

// ─── Restore ─────────────────────────────────────────────────────────

export async function restoreExpense(expenseId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: expenses.id,
        deletedAt: expenses.deletedAt,
        groupId: expenses.groupId,
        currency: expenses.currency,
        amount: expenses.amount,
        splitType: expenses.splitType,
      })
      .from(expenses)
      .where(eq(expenses.id, expenseId));

    if (!row || !row.deletedAt) {
      throw Object.assign(new Error("Expense not found or not deleted"), { code: "NOT_FOUND" });
    }

    // Fetch current participants
    const parts = await tx
      .select()
      .from(expenseParticipants)
      .where(eq(expenseParticipants.expenseId, expenseId));

    // Re-derive ledger entries from existing participant data
    const edges = computeLedgerEdges(
      parts.map((p) => ({ userId: p.userId, paid: p.paid, owed: p.owed })),
    );

    await writeLedgerEntries(
      tx,
      edges,
      scopeId(row.groupId),
      row.currency,
      { expenseId },
    );

    // Restore the expense (trigger will verify balance)
    await tx
      .update(expenses)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(expenses.id, expenseId));
  });
}
