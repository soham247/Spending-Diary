import { beforeEach, describe, expect, it } from "vitest";
import { createId } from "@paralleldrive/cuid2";
import { db } from "@/lib/db/client";
import { users, groups } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  createExpense,
  editExpense,
  deleteExpense,
  restoreExpense,
} from "@/lib/domain/expenses";
import {
  createGroup,
  updateGroup,
  changeGroupMember,
} from "@/lib/domain/groups";
import { getGroup } from "@/lib/db/queries/groups";
import { listExpenses } from "@/lib/db/queries/expenses";
import { getProfile } from "@/lib/db/queries/profile";
import { updateProfile } from "@/lib/domain/profile";
import { createPlaceholder, updateFriend } from "@/lib/domain/friends";
import { getExpenseById } from "@/lib/db/queries/expenses";
import { getOverallBalances } from "@/lib/db/queries/balances";
import { createExpenseSchema } from "@/lib/validation/expense";
let owner: string;
let outsider: string;
beforeEach(async () => {
  owner = createId();
  outsider = createId();
  await db.insert(users).values(
    [owner, outsider].map((id) => ({
      id,
      name: "Fixture",
      email: id + "@example.test",
      emailVerified: true,
    })),
  );
});
describe("app shell reads and profile writes", () => {
  it("counts only the viewer's share within inclusive dates and updates after delete and restore", async () => {
    const friend = await createPlaceholder(
      owner,
      { name: "Spending friend" },
      createId(),
    );
    const make = (
      date: string,
      participants = [{ userId: owner, paid: 9000 }],
    ) =>
      createExpense(
        owner,
        createExpenseSchema.parse({
          amount: 9000,
          description: "Spending fixture",
          category: "Food",
          currency: "INR",
          date,
          splitType: "EQUAL",
          participants,
        }),
        createId(),
      );
    const personal = await make("2026-11-01");
    const shared = await make("2026-11-15", [
      { userId: owner, paid: 0 },
      { userId: friend, paid: 9000 },
    ]);
    await make("2026-10-31");
    await make("2026-11-16");
    await createExpense(
      owner,
      createExpenseSchema.parse({
        amount: 9000,
        description: "Paid only",
        category: "Food",
        currency: "INR",
        date: "2026-11-01",
        splitType: "EQUAL",
        participants: [
          { userId: owner, paid: 9000, includedInSplit: false },
          { userId: friend, paid: 0 },
        ],
      }),
      createId(),
    );
    const filter = {
      scope: "mine" as const,
      from: "2026-11-01",
      to: "2026-11-15",
    };
    const result = await listExpenses(owner, filter);
    expect(result.items.map((row) => row.id)).toEqual([shared, personal]);
    expect(result.items.map((row) => row.yourShare)).toEqual([4500, 9000]);
    expect(result.spendingTotals).toEqual([{ currency: "INR", amount: 13500 }]);
    expect(
      (await listExpenses(owner, { ...filter, kind: "PERSONAL" }))
        .spendingTotals,
    ).toEqual([{ currency: "INR", amount: 9000 }]);
    expect(
      (await listExpenses(owner, { ...filter, kind: "SHARED" })).spendingTotals,
    ).toEqual([{ currency: "INR", amount: 4500 }]);
    expect((await listExpenses(outsider, filter)).spendingTotals).toEqual([]);
    await deleteExpense(owner, personal);
    expect((await listExpenses(owner, filter)).spendingTotals).toEqual([
      { currency: "INR", amount: 4500 },
    ]);
    await restoreExpense(owner, personal);
    expect((await listExpenses(owner, filter)).spendingTotals).toEqual(
      result.spendingTotals,
    );
  });
  it.each(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"] as const)(
    "round-trips payer-only participation for %s through edits and restore",
    async (splitType) => {
      const b = await createPlaceholder(owner, { name: "B" }, createId());
      const c = await createPlaceholder(owner, { name: "C" }, createId());
      const input = createExpenseSchema.parse({
        description: "A pays for B and C",
        category: "Food",
        amount: 9000,
        currency: "INR",
        date: "2026-10-31",
        splitType,
        participants: [owner, b, c].map((userId, index) => ({
          userId,
          paid: index === 0 ? 9000 : 0,
          includedInSplit: index !== 0,
          ...(splitType === "EXACT"
            ? { owed: index === 0 ? 0 : 4500 }
            : splitType === "PERCENTAGE"
              ? { percentage: index === 0 ? 0 : 50 }
              : splitType === "SHARES"
                ? { shares: index === 0 ? 0 : 1 }
                : {}),
        })),
      });
      const key = createId();
      const id = await createExpense(owner, input, key);
      expect(await createExpense(owner, input, key)).toBe(id);
      await editExpense(owner, id, {
        version: 1,
        description: "Updated description",
      });
      let detail = await getExpenseById(owner, id);
      expect(
        detail?.participants.find((p) => p.userId === owner),
      ).toMatchObject({ paid: 9000, owed: 0, includedInSplit: false });
      expect(
        detail?.participants
          .filter((p) => p.userId !== owner)
          .map((p) => p.owed),
      ).toEqual([4500, 4500]);
      await editExpense(owner, id, { version: 2, ...input });
      detail = await getExpenseById(owner, id);
      expect(
        detail?.participants.find((p) => p.userId === owner)?.includedInSplit,
      ).toBe(false);
      await deleteExpense(owner, id);
      expect(await getOverallBalances(owner)).toHaveLength(0);
      await restoreExpense(owner, id);
      const debts = await getOverallBalances(owner);
      expect(debts).toHaveLength(2);
      expect(
        debts.every(
          (row) =>
            row.scopeId === "direct" &&
            (row.userLowId === owner ? -row.amount : row.amount) ===
              BigInt(4500),
        ),
      ).toBe(true);
      expect(
        (await getExpenseById(owner, id))?.participants.find(
          (p) => p.userId === owner,
        )?.includedInSplit,
      ).toBe(false);
    },
  );
  it("splits a direct expense among four people with scoped balances and no group", async () => {
    const friends = [];
    for (const name of ["Alex", "Blake", "Casey"])
      friends.push(await createPlaceholder(owner, { name }, createId()));
    const input = createExpenseSchema.parse({
      groupId: null,
      amount: 10001,
      description: "Dinner",
      category: "Food",
      currency: "INR",
      date: "2026-10-31",
      splitType: "EQUAL",
      participants: [
        { userId: owner, paid: 10001 },
        ...friends.map((userId) => ({ userId, paid: 0 })),
      ],
    });
    const id = await createExpense(owner, input, createId());
    const detail = await getExpenseById(owner, id);
    if (!detail) throw new Error("Expected the direct expense to be visible");
    expect(detail).toMatchObject({ groupId: null, kind: "SHARED" });
    expect(detail.participants).toHaveLength(4);
    expect(
      detail.participants.reduce((total, person) => total + person.owed, 0),
    ).toBe(10001);
    const debts = await getOverallBalances(owner);
    expect(debts).toHaveLength(3);
    expect(
      debts.every((row) => row.scopeId === "direct" && row.currency === "INR"),
    ).toBe(true);
    expect(await db.select().from(groups)).toHaveLength(0);
    await expect(getExpenseById(outsider, id)).resolves.toBeNull();
    await updateFriend(owner, friends[0], { blocked: true });
    await expect(createExpense(owner, input, createId())).rejects.toMatchObject(
      { statusCode: 404 },
    );
    expect((await listExpenses(owner)).items).toHaveLength(1);
  });
  it("updates only the active viewer and rejects protected fields", async () => {
    await updateProfile(owner, {
      name: "Owner",
      upiId: "owner@upi",
      completeOnboarding: true,
    });
    expect(await getProfile(owner)).toMatchObject({
      name: "Owner",
      upiId: "owner@upi",
      onboardedAt: expect.any(Date),
    });
    expect(await getProfile(outsider)).toMatchObject({
      name: "Fixture",
      upiId: null,
    });
    await expect(
      updateProfile(owner, { status: "ACTIVE" } as never),
    ).rejects.toThrow();
    await db
      .update(users)
      .set({ status: "DELETED" })
      .where(eq(users.id, owner));
    await expect(updateProfile(owner, { name: "No" })).rejects.toMatchObject({
      statusCode: 401,
    });
  });
  it("paginates stable date ties without leaking another viewer's rows", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 31; i++)
      ids.push(
        await createExpense(
          owner,
          {
            amount: 123,
            description: "Personal",
            category: "Other",
            currency: "INR",
            date: "2026-10-29",
            splitType: "EQUAL",
            participants: [{ userId: owner, paid: 123 }],
          },
          createId(),
        ),
      );
    const first = await listExpenses(owner, { kind: "PERSONAL" });
    const second = await listExpenses(owner, {
      kind: "PERSONAL",
      cursor: first.nextCursor!,
    });
    expect(first.items).toHaveLength(30);
    expect(second.items).toHaveLength(1);
    expect(
      new Set([...first.items, ...second.items].map((row) => row.id)),
    ).toEqual(new Set(ids));
    const spending = await listExpenses(owner, {
      scope: "mine",
      from: "2026-10-29",
      to: "2026-10-29",
    });
    expect(spending.items).toHaveLength(30);
    expect(spending.spendingTotals).toEqual([
      { currency: "INR", amount: 3813 },
    ]);
    const spendingNext = await listExpenses(owner, {
      scope: "mine",
      from: "2026-10-29",
      to: "2026-10-29",
      cursor: spending.nextCursor!,
    });
    expect(spendingNext.items).toHaveLength(1);
    expect(spendingNext.spendingTotals).toEqual(spending.spendingTotals);
    expect((await listExpenses(outsider)).items).toEqual([]);
    expect((await listExpenses(outsider, { cursor: ids[0] })).items).toEqual(
      [],
    );
  });
});
describe("group creation and management", () => {
  it("replays creates and denies outsider access and edits", async () => {
    const key = createId();
    const id = await createGroup(owner, { name: "Trip" }, key);
    expect(await createGroup(owner, { name: "Trip" }, key)).toBe(id);
    await expect(
      createGroup(owner, { name: "Different" }, key),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(await getGroup(owner, id)).toMatchObject({
      viewerRole: "ADMIN",
      canManage: true,
    });
    await expect(getGroup(outsider, id)).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(
      updateGroup(outsider, id, { name: "Forged" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
  it("archives without deleting and blocks writes to an archived group", async () => {
    const id = await createGroup(owner, { name: "Trip" }, createId());
    await updateGroup(owner, id, { archived: true });
    expect((await getGroup(owner, id)).canWrite).toBe(false);
    await expect(
      createExpense(
        owner,
        {
          groupId: id,
          amount: 123,
          description: "No",
          category: "Other",
          currency: "INR",
          date: "2026-10-29",
          splitType: "EQUAL",
          participants: [{ userId: owner, paid: 123 }],
        },
        createId(),
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(await db.select().from(groups)).toHaveLength(1);
    await updateGroup(owner, id, { archived: false });
    await expect(
      changeGroupMember(owner, id, { action: "LEAVE" }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });
});
