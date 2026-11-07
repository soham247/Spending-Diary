import { beforeEach, describe, expect, it } from "vitest";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  users,
  balances,
  settlements,
  ledgerEntries,
  accounts,
  sessions,
  expenses,
  inviteClaimReports,
} from "@/lib/db/schema";
import { createPlaceholder } from "@/lib/domain/friends";
import {
  createInvite,
  claimGroupOrPersonalInvite,
  reportInviteClaim,
} from "@/lib/domain/invites";
import { createExpense, deleteExpense } from "@/lib/domain/expenses";
import {
  createSettlement,
  deleteSettlement,
  restoreSettlement,
} from "@/lib/domain/settlements";
import { getInsights } from "@/lib/db/queries/insights";
import { listActivity } from "@/lib/db/queries/activity";
import { markActivityRead } from "@/lib/domain/activity";
import { reconcileBalances } from "@/lib/domain/reconciliation";
import { anonymizeAccount } from "@/lib/domain/account";
import { createAuth } from "@/lib/auth/auth";
import { setTestMailbox } from "@/lib/mail/transport";
let owner: string;
let placeholder: string;
beforeEach(async () => {
  owner = createId();
  await db.insert(users).values({
    id: owner,
    name: "Owner",
    email: owner + "@example.test",
    emailVerified: true,
  });
  placeholder = await createPlaceholder(owner, { name: "Invited" }, createId());
});
const body = () => ({
  description: "Shared dinner",
  category: "Food" as const,
  amount: 10000,
  currency: "INR" as const,
  date: "2026-10-29",
  splitType: "EQUAL" as const,
  participants: [
    { userId: owner, paid: 10000 },
    { userId: placeholder, paid: 0 },
  ],
});
describe("remaining MVP guarantees", () => {
  it("retains and voids collapsed settlements during an identity merge", async () => {
    await createExpense(owner, body(), createId());
    const paymentId = await createSettlement(
      owner,
      {
        fromUserId: placeholder,
        toUserId: owner,
        amount: 1000,
        currency: "INR",
        date: "2026-10-29",
        method: "CASH",
      },
      createId(),
    );
    const link = await createInvite(
      owner,
      { type: "DIRECT", placeholderId: placeholder },
      createId(),
    );
    await claimGroupOrPersonalInvite(owner, link.token);
    const [payment] = await db
      .select()
      .from(settlements)
      .where(eq(settlements.id, paymentId));
    expect(payment).toMatchObject({
      fromUserId: placeholder,
      toUserId: owner,
      deletedAt: expect.any(Date),
    });
    expect(
      (await db.select().from(ledgerEntries)).every(
        (entry) => entry.voidedAt !== null,
      ),
    ).toBe(true);
    expect(await db.select().from(balances)).toHaveLength(0);
    expect(await reconcileBalances()).toMatchObject({ matched: true });
    await expect(restoreSettlement(owner, paymentId)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
  it("records wrong-claim reports without altering financial data", async () => {
    const real = createId();
    await db.insert(users).values({
      id: real,
      name: "Real",
      email: real + "@example.test",
      emailVerified: true,
    });
    await createExpense(owner, body(), createId());
    const link = await createInvite(
      owner,
      { type: "DIRECT", placeholderId: placeholder },
      createId(),
    );
    await claimGroupOrPersonalInvite(real, link.token);
    const before = await db.select().from(balances);
    const key = createId();
    const id = await reportInviteClaim(
      owner,
      link.id,
      { reason: "Wrong person" },
      key,
    );
    expect(
      await reportInviteClaim(owner, link.id, { reason: "Wrong person" }, key),
    ).toBe(id);
    await expect(
      reportInviteClaim(real, link.id, {}, createId()),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(await db.select().from(inviteClaimReports)).toHaveLength(1);
    expect(await db.select().from(balances)).toEqual(before);
  });
  it("insights sum owed shares and exclude settlements and deleted expenses", async () => {
    await createExpense(owner, body(), createId());
    const payment = await createSettlement(
      owner,
      {
        fromUserId: placeholder,
        toUserId: owner,
        amount: 1000,
        currency: "INR",
        date: "2026-10-29",
        method: "CASH",
      },
      createId(),
    );
    const deleted = await createExpense(
      owner,
      { ...body(), participants: [{ userId: owner, paid: 10000 }] },
      createId(),
    );
    await deleteExpense(owner, deleted);
    expect(await getInsights(owner, { month: "2026-10" })).toMatchObject([
      { total: 5000, categories: [{ category: "Food", amount: 5000 }] },
    ]);
    await deleteSettlement(owner, payment);
    await restoreSettlement(owner, payment);
    expect((await getInsights(owner, { month: "2026-10" }))[0]?.total).toBe(
      5000,
    );
    const feed = await listActivity(owner, {});
    expect(feed.items.some((event) => event.type === "EXPENSE_CREATED")).toBe(
      true,
    );
    await markActivityRead(owner, feed.items[0]!.id);
    const outsider = createId();
    await db.insert(users).values({
      id: outsider,
      name: "Outsider",
      email: outsider + "@example.test",
      emailVerified: true,
    });
    await expect(
      markActivityRead(outsider, feed.items[0]!.id),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
  it("reconciliation reports drift without repairing the cache", async () => {
    await createExpense(owner, body(), createId());
    const [row] = await db.select().from(balances);
    await db.update(balances).set({ amount: row!.amount + BigInt(1) });
    expect(await reconcileBalances()).toMatchObject({
      matched: false,
      mismatchCount: 1,
    });
    expect((await db.select().from(balances))[0]?.amount).toBe(
      row!.amount + BigInt(1),
    );
  });
  it("account anonymization verifies credentials and preserves expenses", async () => {
    const mailbox: {
      to: string;
      subject: string;
      html: string;
      text: string;
    }[] = [];
    setTestMailbox(mailbox);
    try {
      const auth = createAuth({
        baseURL: "http://localhost:3000",
        logger: { disabled: true },
      });
      const email = createId() + "@example.test";
      const password = "Valid-password-" + createId();
      const signed = await auth.handler(
        new Request("http://localhost:3000/api/auth/sign-up/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "http://localhost:3000",
          },
          body: JSON.stringify({ email, password, name: "Delete fixture" }),
        }),
      );
      const id = (await signed.json()).user.id as string;
      await db
        .update(users)
        .set({ emailVerified: true })
        .where(eq(users.id, id));
      const login = await auth.handler(
        new Request("http://localhost:3000/api/auth/sign-in/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "http://localhost:3000",
          },
          body: JSON.stringify({ email, password }),
        }),
      );
      const cookie = login.headers
        .getSetCookie()
        .find((value) => value.startsWith("better-auth.session_token="))!
        .split(";")[0]!;
      const headers = new Headers({ cookie });
      await createExpense(
        id,
        { ...body(), participants: [{ userId: id, paid: 10000 }] },
        createId(),
      );
      await expect(
        anonymizeAccount(id, headers, "Wrong password"),
      ).rejects.toMatchObject({ statusCode: 403 });
      await anonymizeAccount(id, headers, password);
      expect(
        (await db.select().from(users).where(eq(users.id, id)))[0],
      ).toMatchObject({
        status: "DELETED",
        name: "Former member",
        phone: null,
        upiId: null,
      });
      expect(
        await db.select().from(accounts).where(eq(accounts.userId, id)),
      ).toHaveLength(0);
      expect(
        await db.select().from(sessions).where(eq(sessions.userId, id)),
      ).toHaveLength(0);
      expect(
        await db.select().from(expenses).where(eq(expenses.createdById, id)),
      ).toHaveLength(1);
    } finally {
      setTestMailbox(null);
    }
  });
});
