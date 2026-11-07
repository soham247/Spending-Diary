import { beforeEach, describe, expect, it } from "vitest";
import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  balances,
  friendships,
  groupMembers,
  groups,
  ledgerEntries,
  settlements,
  users,
} from "@/lib/db/schema";
import { createExpense } from "@/lib/domain/expenses";
import {
  createSettlement,
  deleteSettlement,
  restoreSettlement,
} from "@/lib/domain/settlements";
import { getPaymentContext } from "@/lib/db/queries/payment-context";
import { listExpenses } from "@/lib/db/queries/expenses";
import { listSettlements } from "@/lib/db/queries/settlements";
import { listActivity } from "@/lib/db/queries/activity";
import { assertGroupMember } from "@/lib/auth/guards";
import { orderPair } from "@/lib/utils/order-pair";

let owner: string;
let friend: string;
let third: string;
let outsider: string;
let groupId: string;
const key = () => createId();
const payment = (amount: number, fromUserId = friend, toUserId = owner) => ({
  fromUserId,
  toUserId,
  amount,
  groupId,
  currency: "INR" as const,
  method: "OTHER" as const,
  date: "2026-11-06",
  note: "Rent repayment",
});
async function net(userId = owner, otherId = friend, scope = groupId) {
  const rows = await db
    .select()
    .from(balances)
    .where(and(eq(balances.scopeId, scope), eq(balances.currency, "INR")));
  const row = rows.find(
    (row) =>
      (row.userLowId === userId && row.userHighId === otherId) ||
      (row.userHighId === userId && row.userLowId === otherId),
  );
  return row
    ? row.userLowId === userId
      ? -row.amount
      : row.amount
    : BigInt(0);
}
async function removeFriend() {
  await db
    .update(groupMembers)
    .set({ status: "REMOVED" })
    .where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, friend)),
    );
}
async function expense(payer = owner, debtor = friend) {
  return createExpense(
    payer,
    {
      groupId,
      description: "Covered meal",
      category: "Food",
      amount: 10000,
      currency: "INR",
      date: "2026-11-06",
      splitType: "EXACT",
      participants: [
        { userId: payer, paid: 10000, owed: 0, includedInSplit: false },
        { userId: debtor, paid: 0, owed: 10000, includedInSplit: true },
      ],
    },
    key(),
  );
}
beforeEach(async () => {
  [owner, friend, third, outsider, groupId] = [
    key(),
    key(),
    key(),
    key(),
    key(),
  ];
  await db.insert(users).values(
    [owner, friend, third, outsider].map((id) => ({
      id,
      name: id,
      email: id + "@example.test",
      emailVerified: true,
    })),
  );
  const [low, high] = orderPair(owner, friend);
  await db.insert(friendships).values({ userLowId: low, userHighId: high });
  await db
    .insert(groups)
    .values({ id: groupId, name: "Trip", createdById: owner });
  await db.insert(groupMembers).values([
    { groupId, userId: owner, role: "ADMIN" },
    { groupId, userId: friend },
    { groupId, userId: third },
  ]);
});
describe("custom payments", () => {
  it("isolates scopes, preserves spending, records notes and reverses the ledger exactly", async () => {
    await expense();
    const before = await listExpenses(friend, { scope: "mine" });
    expect(before.spendingTotals).toEqual([{ currency: "INR", amount: 10000 }]);
    const id = await createSettlement(owner, payment(4000), key());
    expect(await net()).toBe(BigInt(6000));
    const direct = await createSettlement(
      owner,
      { ...payment(2000, owner, friend), groupId: null },
      key(),
    );
    expect(await net()).toBe(BigInt(6000));
    expect(await net(owner, friend, "direct")).toBe(BigInt(2000));
    expect(
      (await listSettlements(owner)).items.find((row) => row.id === id)?.note,
    ).toBe("Rent repayment");
    const event = (await listActivity(owner, {})).items.find(
      (row) => row.settlementId === id,
    );
    expect(event).toMatchObject({
      fromName: friend,
      toName: owner,
      paymentNote: "Rent repayment",
    });
    await deleteSettlement(friend, id);
    expect(await net()).toBe(BigInt(10000));
    await restoreSettlement(owner, id);
    expect(await net()).toBe(BigInt(6000));
    expect(
      (await listExpenses(friend, { scope: "mine" })).spendingTotals,
    ).toEqual(before.spendingTotals);
    const edges = await db
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.settlementId, id));
    expect(edges.filter((row) => !row.voidedAt)).toHaveLength(1);
    expect(edges.filter((row) => row.voidedAt)).toHaveLength(1);
    await deleteSettlement(owner, direct);
  });
  it("allows advances, partial repayments, overpayment and reversed direction for active parties", async () => {
    await createSettlement(owner, payment(20000, owner, friend), key());
    expect(await net()).toBe(BigInt(20000));
    await createSettlement(friend, payment(4000), key());
    expect(await net()).toBe(BigInt(16000));
    await createSettlement(owner, payment(5000, owner, friend), key());
    expect(await net()).toBe(BigInt(21000));
    await createSettlement(friend, payment(25000), key());
    expect(await net()).toBe(BigInt(-4000));
    expect(await net(friend, owner)).toBe(BigInt(4000));
  });
  it("lets either party record a former member's debt and delete/undo after settlement", async () => {
    await expense();
    await removeFriend();
    const scopes = await getPaymentContext(friend);
    expect(scopes.find((scope) => scope.id === groupId)?.people).toMatchObject([
      { id: owner, net: -10000, restricted: true },
    ]);
    await expect(assertGroupMember(friend, groupId)).rejects.toMatchObject({
      statusCode: 404,
    });
    await createSettlement(owner, payment(4000), key());
    const body = payment(6000);
    const token = key();
    const id = await createSettlement(friend, body, token);
    expect(await createSettlement(friend, body, token)).toBe(id);
    expect(await net()).toBe(BigInt(0));
    expect(
      (await getPaymentContext(friend)).some((scope) => scope.id === groupId),
    ).toBe(false);
    expect(
      (await listSettlements(friend, { groupId })).items.find(
        (row) => row.id === id,
      )?.canEdit,
    ).toBe(true);
    await deleteSettlement(friend, id);
    expect(await net()).toBe(BigInt(6000));
    await restoreSettlement(friend, id);
    expect(await net()).toBe(BigInt(0));
    await expect(
      createSettlement(owner, payment(1), key()),
    ).rejects.toMatchObject({ statusCode: 422 });
  });
  it("lists former members with offsetting debts but rejects new debt and overpayment", async () => {
    await expense();
    await expense(friend, third);
    await removeFriend();
    expect(
      (await getPaymentContext(third)).find((scope) => scope.id === groupId)
        ?.people,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: friend, restricted: true }),
      ]),
    );
    await expect(
      createSettlement(owner, payment(10001), key()),
    ).rejects.toMatchObject({ statusCode: 422 });
    await expect(
      createSettlement(owner, payment(1, owner, friend), key()),
    ).rejects.toMatchObject({ statusCode: 422 });
    await expect(
      createSettlement(third, payment(1, third, owner), key()),
    ).resolves.toBeTypeOf("string");
    await expect(
      createSettlement(outsider, payment(1), key()),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(
      (await getPaymentContext(outsider)).flatMap((scope) => scope.people),
    ).toEqual([]);
  });
  it("restricts blocked pairs and archived groups and never changes expenses", async () => {
    await expense();
    await db.update(friendships).set({ status: "BLOCKED" });
    await expect(
      createSettlement(friend, payment(10001), key()),
    ).rejects.toMatchObject({ statusCode: 422 });
    const id = await createSettlement(friend, payment(10000), key());
    await deleteSettlement(owner, id);
    await db
      .update(groups)
      .set({ archivedAt: new Date() })
      .where(eq(groups.id, groupId));
    expect(
      (await getPaymentContext(owner)).some((scope) => scope.id === groupId),
    ).toBe(false);
    await expect(restoreSettlement(friend, id)).rejects.toMatchObject({
      statusCode: 403,
    });
    await expect(
      createSettlement(owner, payment(100), key()),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(
      (await listSettlements(owner, { deleted: "true" })).items[0]?.canEdit,
    ).toBe(false);
    expect(
      (await db.select().from(settlements).where(eq(settlements.id, id)))[0]
        ?.deletedAt,
    ).toBeTruthy();
  });
  it("lets a former creditor record repayment and rejects restoring an overpayment", async () => {
    await expense();
    await db
      .update(groupMembers)
      .set({ status: "LEFT" })
      .where(
        and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, owner)),
      );
    expect(
      (await getPaymentContext(owner)).find((scope) => scope.id === groupId)
        ?.people,
    ).toMatchObject([{ id: friend, net: 10000, restricted: true }]);
    const id = await createSettlement(owner, payment(10000), key());
    await deleteSettlement(owner, id);
    await createSettlement(friend, payment(5000), key());
    await expect(restoreSettlement(owner, id)).rejects.toMatchObject({
      statusCode: 422,
    });
    expect(await net()).toBe(BigInt(5000));
    expect(
      (
        await db
          .select()
          .from(ledgerEntries)
          .where(eq(ledgerEntries.settlementId, id))
      ).every((row) => row.voidedAt),
    ).toBe(true);
  });
});
