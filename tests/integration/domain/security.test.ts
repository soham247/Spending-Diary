import { voidLedgerEntries, writeLedgerEntries } from "@/lib/domain/ledger";
import { beforeEach, describe, expect, it } from "vitest";
import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { balances, expenseParticipants, expenses, friendships, groupMembers, groups, idempotencyRecords, ledgerEntries, users } from "@/lib/db/schema";
import { createExpense, deleteExpense, editExpense, restoreExpense } from "@/lib/domain/expenses";
import { createSettlement, deleteSettlement } from "@/lib/domain/settlements";
import { getGroupExpenses } from "@/lib/db/queries/expenses";
import { orderPair } from "@/lib/utils/order-pair";
import type { CreateExpenseInput } from "@/lib/validation/expense";
import type { CreateSettlementInput } from "@/lib/validation/settlement";

let owner: string; let friend: string; let outsider: string; let groupId: string;
const key = () => createId();
function input(extra: Partial<CreateExpenseInput> = {}): CreateExpenseInput {
  return { description: "Security fixture", category: "Food", amount: 10000, currency: "INR", date: "2026-10-29", splitType: "EQUAL", participants: [{ userId: owner, paid: 10000 }, { userId: friend, paid: 0 }], ...extra } as CreateExpenseInput;
}
function payment(extra: Partial<CreateSettlementInput> = {}): CreateSettlementInput {
  return { fromUserId: friend, toUserId: owner, amount: 2000, currency: "INR", method: "CASH", date: "2026-10-29", ...extra };
}
async function debt() {
  const [low, high] = orderPair(owner, friend);
  const [row] = await db.select().from(balances).where(and(eq(balances.scopeId, "direct"), eq(balances.userLowId, low), eq(balances.userHighId, high), eq(balances.currency, "INR")));
  return row?.amount ?? BigInt(0);
}
beforeEach(async () => {
  [owner, friend, outsider] = [key(), key(), key()];
  await db.insert(users).values([owner, friend, outsider].map(id => ({ id, name: id, email: id + "@example.test", emailVerified: true })));
  const [low, high] = orderPair(owner, friend);
  await db.insert(friendships).values({ userLowId: low, userHighId: high });
  groupId = key();
  await db.insert(groups).values({ id: groupId, name: "Security group", currency: "INR", createdById: owner });
  await db.insert(groupMembers).values([{ groupId, userId: owner, role: "ADMIN" }, { groupId, userId: friend }]);
});
describe("transactional authorization and integrity", () => {
  it("blocks all outsider expense mutations without changing the target", async () => {
    const id = await createExpense(owner, input(), key());
    const before = await debt();
    await expect(editExpense(outsider, id, { version: 1, description: "Forged" })).rejects.toMatchObject({ statusCode: 404 });
    await expect(deleteExpense(outsider, id)).rejects.toMatchObject({ statusCode: 404 });
    const [row] = await db.select().from(expenses).where(eq(expenses.id, id));
    expect(row?.description).toBe("Security fixture"); expect(row?.version).toBe(1);
    await deleteExpense(owner, id);
    await expect(restoreExpense(outsider, id)).rejects.toMatchObject({ statusCode: 404 });
    await restoreExpense(owner, id); expect(await debt()).toBe(before);
  });
  it("rejects forged participant and foreign-group records", async () => {
    await expect(createExpense(outsider, input(), key())).rejects.toMatchObject({ statusCode: 404 });
    await expect(createExpense(outsider, input({ groupId }), key())).rejects.toMatchObject({ statusCode: 404 });
    await expect(createSettlement(outsider, payment(), key())).rejects.toMatchObject({ statusCode: 404 });
    expect(await db.select().from(ledgerEntries)).toHaveLength(0);
  });
  it("allows a participant and group admin to edit, but not a nonparticipant member", async () => {
    const id = await createExpense(owner, input({ groupId, participants: [{ userId: friend, paid: 10000 }] }), key());
    await editExpense(owner, id, { version: 1, description: "Admin edit" });
    await editExpense(friend, id, { version: 2, description: "Participant edit" });
    await db.insert(groupMembers).values({ groupId, userId: outsider });
    await expect(editExpense(outsider, id, { version: 3, description: "Forbidden" })).rejects.toMatchObject({ statusCode: 404 });
  });
  it("rejects new expenses after blocking a friendship", async () => {
    const [low, high] = orderPair(owner, friend);
    await db.update(friendships).set({ status: "BLOCKED", blockedById: friend }).where(and(eq(friendships.userLowId, low), eq(friendships.userHighId, high)));
    await expect(createExpense(owner, input(), key())).rejects.toMatchObject({ statusCode: 404 });
  });
  it("rejects archived-group writes", async () => {
    const id = await createExpense(owner, input({ groupId }), key());
    await db.update(groups).set({ archivedAt: new Date() }).where(eq(groups.id, groupId));
    await expect(editExpense(owner, id, { version: 1, description: "No" })).rejects.toMatchObject({ statusCode: 403 });
    await expect(createExpense(owner, input({ groupId }), key())).rejects.toMatchObject({ statusCode: 403 });
  });
  it("allows exactly one concurrent edit with the same version", async () => {
    const id = await createExpense(owner, input(), key());
    const results = await Promise.allSettled([editExpense(owner, id, { version: 1, description: "A" }), editExpense(friend, id, { version: 1, description: "B" })]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
    const rejected = results.find(r => r.status === "rejected"); if (rejected?.status === "rejected") expect(rejected.reason).toMatchObject({ statusCode: 409 });
  });
  it("atomically replays concurrent expense creates and persists the original digest after edits", async () => {
    const k = key(); const body = input();
    const ids = await Promise.all([createExpense(owner, body, k), createExpense(owner, body, k)]);
    expect(ids[0]).toBe(ids[1]); expect(await db.select().from(expenses)).toHaveLength(1);
    const before = await debt();
    await editExpense(owner, ids[0]!, { version: 1, description: "New description" });
    expect(await createExpense(owner, body, k)).toBe(ids[0]); expect(await debt()).toBe(before);
    await expect(createExpense(owner, { ...body, description: "Changed retry" }, k)).rejects.toMatchObject({ statusCode: 409 });
    expect(await db.select().from(idempotencyRecords)).toHaveLength(1);
  });
  it("settlement retries are atomic, reduce debt, and void exactly once", async () => {
    await createExpense(owner, input(), key()); const before = await debt();
    const k = key(); const p = payment();
    const ids = await Promise.all([createSettlement(owner, p, k), createSettlement(owner, p, k)]);
    expect(ids[0]).toBe(ids[1]); expect(await debt()).toBe(before * BigInt(3) / BigInt(5));
    await expect(createSettlement(owner, payment({ amount: 2001 }), k)).rejects.toMatchObject({ statusCode: 409 });
    await expect(deleteSettlement(outsider, ids[0]!)).rejects.toMatchObject({ statusCode: 404 });
    await deleteSettlement(friend, ids[0]!); expect(await debt()).toBe(before);
    await expect(deleteSettlement(owner, ids[0]!)).rejects.toMatchObject({ statusCode: 404 }); expect(await debt()).toBe(before);
  });
  it("rebuilds ledger for a balanced amount edit and rolls back an unbalanced edit", async () => {
    const id = await createExpense(owner, input(), key()); const before = await debt();
    await expect(editExpense(owner, id, { version: 1, amount: 12000 })).rejects.toBeDefined();
    expect(await debt()).toBe(before);
    await editExpense(owner, id, { version: 1, amount: 12000, splitType: "EXACT", participants: [{ userId: owner, paid: 12000, owed: 6000 }, { userId: friend, paid: 0, owed: 6000 }] });
    expect(await debt()).toBe(before * BigInt(6) / BigInt(5));
    const entries = await db.select().from(ledgerEntries).where(eq(ledgerEntries.expenseId, id));
    expect(entries.filter(e => e.voidedAt)).toHaveLength(1); expect(entries.filter(e => !e.voidedAt)).toHaveLength(1);
    const parts = await db.select().from(expenseParticipants).where(eq(expenseParticipants.expenseId, id));
    expect(parts.reduce((s, p) => s + p.paid, 0)).toBe(12000); expect(parts.reduce((s, p) => s + p.owed, 0)).toBe(12000);
  });
  it("scopes group queries by viewer and paginates without duplicates", async () => {
    await createExpense(owner, input({ groupId }), key()); await createExpense(owner, input({ groupId }), key());
    expect((await getGroupExpenses(outsider, groupId)).items).toHaveLength(0);
    const first = await getGroupExpenses(owner, groupId, 1);
    const second = await getGroupExpenses(owner, groupId, 1, first.nextCursor!);
    expect(first.items).toHaveLength(1); expect(second.items).toHaveLength(1); expect(first.items[0]?.id).not.toBe(second.items[0]?.id);
  });
  it("permits repayment after blocking, caps concurrent payments at the existing debt, and keeps retries idempotent", async () => {
    await createExpense(owner, input(), key());
    const [low, high] = orderPair(owner, friend);
    await db.update(friendships).set({ status: "BLOCKED", blockedById: friend }).where(and(eq(friendships.userLowId, low), eq(friendships.userHighId, high)));
    const firstKey = key(); const secondKey = key();
    const p = payment({ amount: 3000 });
    const results = await Promise.allSettled([createSettlement(owner, p, firstKey), createSettlement(friend, p, secondKey)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const winningKey = results[0]?.status === "fulfilled" ? firstKey : secondKey;
    const winningCaller = results[0]?.status === "fulfilled" ? owner : friend;
    const winner = results.find(r => r.status === "fulfilled");
    expect(await createSettlement(winningCaller, p, winningKey)).toBe(winner?.status === "fulfilled" ? winner.value : "");
    expect(await debt() === BigInt(2000) || await debt() === BigInt(-2000)).toBe(true);
    await createSettlement(friend, payment({ amount: 2000 }), key());
    expect(await debt()).toBe(BigInt(0));
    await expect(createSettlement(owner, payment({ amount: 1 }), key())).rejects.toMatchObject({ statusCode: 422 });
  });

  it("rejects pre-deployment keys without duplicating old financial records", async () => {
    const expenseKey = key(); const body = input();
    await createExpense(owner, body, expenseKey);
    await db.delete(idempotencyRecords);
    const before = await debt();
    await expect(createExpense(owner, body, expenseKey)).rejects.toMatchObject({ statusCode: 409 });
    expect(await debt()).toBe(before); expect(await db.select().from(expenses)).toHaveLength(1);
    const settlementKey = key(); const settlementBody = payment();
    await createSettlement(owner, settlementBody, settlementKey);
    await db.delete(idempotencyRecords);
    const afterPayment = await debt();
    await expect(createSettlement(owner, settlementBody, settlementKey)).rejects.toMatchObject({ statusCode: 409 });
    expect(await debt()).toBe(afterPayment);
  });
  it("enforces the generated idempotency constraints in PostgreSQL", async () => {
    const record = { viewerId: owner, resourceId: key(), requestHash: "a".repeat(64), key: key(), operation: "invalid" };
    await expect(db.insert(idempotencyRecords).values(record)).rejects.toMatchObject({ cause: { code: "23514" } });
    await expect(db.insert(idempotencyRecords).values({ ...record, operation: "expense", key: "a".repeat(201) })).rejects.toMatchObject({ cause: { code: "23514" } });
    expect(await db.select().from(idempotencyRecords)).toHaveLength(0);
  });

  it("moves a legacy foreign-currency ledger to INR atomically during correction", async () => {
    const id = await createExpense(owner, input(), key());
    await db.transaction(async tx => {
      await voidLedgerEntries(tx, { expenseId: id });
      await tx.update(expenses).set({ currency: "USD" }).where(eq(expenses.id, id));
      await writeLedgerEntries(tx, [{ debtorId: friend, creditorId: owner, amount: 5000 }], "direct", "USD", { expenseId: id });
    });
    expect(await debt()).toBe(BigInt(0));
    await editExpense(owner, id, { version: 1, currency: "INR" });
    const rows = await db.select().from(balances);
    expect(rows.filter(r => r.currency === "USD").every(r => r.amount === BigInt(0))).toBe(true);
    const current = rows.find(r => r.currency === "INR");
    expect(current?.amount === BigInt(5000) || current?.amount === BigInt(-5000)).toBe(true);
    const entries = await db.select().from(ledgerEntries).where(eq(ledgerEntries.expenseId, id));
    expect(entries.filter(e => !e.voidedAt).map(e => e.currency)).toEqual(["INR"]);
  });

});
