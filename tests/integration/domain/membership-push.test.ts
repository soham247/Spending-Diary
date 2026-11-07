import { beforeEach, describe, it, expect, vi } from "vitest";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  users,
  balances,
  expenses,
  pushSubscriptions,
  activityRecipients,
} from "@/lib/db/schema";
import { createGroup, changeGroupMember } from "@/lib/domain/groups";
import { createInvite, claimGroupOrPersonalInvite } from "@/lib/domain/invites";
import { getGroup } from "@/lib/db/queries/groups";
import { createExpense } from "@/lib/domain/expenses";
import { saveSubscription } from "@/lib/domain/push";
import { dispatchPush } from "@/lib/push/dispatch";
import { reconcileBalances } from "@/lib/domain/reconciliation";
let owner: string;
let member: string;
beforeEach(async () => {
  owner = createId();
  member = createId();
  await db.insert(users).values(
    [owner, member].map((id) => ({
      id,
      name: id,
      email: id + "@example.test",
      emailVerified: true,
    })),
  );
});
async function join() {
  const groupId = await createGroup(owner, { name: "Membership" }, createId());
  const invite = await createInvite(
    owner,
    { type: "GROUP_LINK", groupId },
    createId(),
  );
  await claimGroupOrPersonalInvite(member, invite.token);
  return groupId;
}
describe("membership and notification failure boundaries", () => {
  it("preserves outstanding debt when an admin removes a member", async () => {
    const groupId = await join();
    await createExpense(
      owner,
      {
        groupId,
        description: "Debt",
        amount: 10000,
        category: "Food",
        date: "2026-10-29",
        currency: "INR",
        splitType: "EQUAL",
        participants: [
          { userId: owner, paid: 10000 },
          { userId: member, paid: 0 },
        ],
      },
      createId(),
    );
    const before = await db.select().from(balances);
    await expect(
      changeGroupMember(member, groupId, { action: "LEAVE" }),
    ).rejects.toMatchObject({ statusCode: 422 });
    await expect(
      changeGroupMember(owner, groupId, { action: "REMOVE", userId: member }),
    ).rejects.toMatchObject({ statusCode: 422 });
    await changeGroupMember(owner, groupId, {
      action: "REMOVE",
      userId: member,
      confirmOutstandingBalance: true,
    });
    expect(await db.select().from(balances)).toEqual(before);
    expect(await getGroup(member, groupId)).toMatchObject({
      viewerStatus: "REMOVED",
      canWrite: false,
    });
  });
  it("undoes a settled leave while denying rejoin after removal", async () => {
    const groupId = await join();
    await changeGroupMember(member, groupId, { action: "LEAVE" });
    await changeGroupMember(member, groupId, { action: "REJOIN" });
    expect((await getGroup(member, groupId)).viewerStatus).toBe("ACTIVE");
    await changeGroupMember(owner, groupId, {
      action: "REMOVE",
      userId: member,
    });
    await expect(
      changeGroupMember(member, groupId, { action: "REJOIN" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
  it("never overwrites another user's push subscription during a race", async () => {
    const endpoint = "https://example.test/push";
    const outcomes = await Promise.allSettled([
      saveSubscription(owner, {
        endpoint,
        keys: { p256dh: "A".repeat(87), auth: "A".repeat(22) },
      }),
      saveSubscription(member, {
        endpoint,
        keys: { p256dh: "B".repeat(87), auth: "B".repeat(22) },
      }),
    ]);
    expect(outcomes.filter((row) => row.status === "fulfilled")).toHaveLength(
      1,
    );
    const [saved] = await db.select().from(pushSubscriptions);
    expect(saved?.p256dh).toBe(
      (saved?.userId === owner ? "A" : "B").repeat(87),
    );
  });
  it("keeps committed money intact when push credentials or encryption are invalid", async () => {
    const groupId = await join();
    const id = await createExpense(
      owner,
      {
        groupId,
        description: "Committed before push",
        amount: 10000,
        category: "Food",
        date: "2026-10-29",
        currency: "INR",
        splitType: "EQUAL",
        participants: [
          { userId: owner, paid: 10000 },
          { userId: member, paid: 0 },
        ],
      },
      createId(),
    );
    await saveSubscription(member, {
      endpoint: "https://example.test/push",
      keys: { p256dh: "A".repeat(87), auth: "A".repeat(22) },
    });
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "invalid");
    vi.stubEnv("VAPID_PRIVATE_KEY", "invalid");
    vi.stubEnv("VAPID_SUBJECT", "mailto:fixture@example.test");
    try {
      expect(await dispatchPush()).toMatchObject({
        configured: true,
        delivered: 0,
      });
      expect(
        await db.select().from(expenses).where(eq(expenses.id, id)),
      ).toHaveLength(1);
      expect(await reconcileBalances()).toMatchObject({ matched: true });
      const pending = await db
        .select()
        .from(activityRecipients)
        .where(eq(activityRecipients.userId, member));
      expect(pending.some((row) => row.pushSentAt === null)).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
