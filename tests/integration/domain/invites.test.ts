import { beforeEach, describe, expect, it } from "vitest";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, expenseParticipants, balances, invites, ledgerEntries, friendships } from "@/lib/db/schema";
import { createPlaceholder } from "@/lib/domain/friends";
import { createInvite, previewInvite, claimGroupOrPersonalInvite, revokeInvite } from "@/lib/domain/invites";
import { createExpense } from "@/lib/domain/expenses";
import { createGroup } from "@/lib/domain/groups";
import { getGroup } from "@/lib/db/queries/groups";
import { getFriend } from "@/lib/db/queries/friends";
let owner: string; let claimer: string; let stranger: string;
beforeEach(async () => {
  [owner,claimer,stranger] = [createId(),createId(),createId()];
  await db.insert(users).values([owner,claimer,stranger].map(id => ({ id, name: id, email: id + "@example.test", emailVerified: true })));
});
describe("invitations and identity merge", () => {
  it("claims a placeholder's history without changing totals and replays the claim", async () => {
    const placeholder = await createPlaceholder(owner, { name: "Invited person" }, createId());
    const expenseId = await createExpense(owner, { amount: 101, description: "Dinner", category: "Food", date: "2026-10-29", currency: "INR", splitType: "EQUAL", participants: [{ userId: owner, paid: 101 }, { userId: placeholder, paid: 0 }] }, createId());
    const invitation = await createInvite(owner, { type: "DIRECT", placeholderId: placeholder }, createId());
    expect(await previewInvite(invitation.token)).toMatchObject({ placeholderName: "Invited person" });
    const result = await claimGroupOrPersonalInvite(claimer, invitation.token);
    expect(result.destination).toBe("/friends/" + owner);
    expect(await claimGroupOrPersonalInvite(claimer, invitation.token)).toEqual(result);
    const participants = await db.select().from(expenseParticipants).where(eq(expenseParticipants.expenseId, expenseId));
    expect(participants.map(p => p.userId)).toContain(claimer);
    expect(participants.reduce((sum,p) => sum + p.owed,0)).toBe(101);
    expect((await getFriend(owner,claimer)).expenses).toHaveLength(1);
    expect((await db.select().from(balances)).some(b => [b.userLowId,b.userHighId].includes(placeholder))).toBe(false);
    await expect(claimGroupOrPersonalInvite(stranger, invitation.token)).rejects.toMatchObject({ statusCode: 404 });
  });
  it("combines overlapping participant rows exactly and voids collapsed debt edges", async () => {
    const placeholder = await createPlaceholder(owner, { name: "Duplicate" }, createId());
    const [low,high] = [owner,claimer].sort() as [string,string];
    await db.insert(friendships).values({ userLowId: low, userHighId: high });
    const id = await createExpense(owner, { amount: 101, description: "Overlap", category: "Food", date: "2026-10-29", currency: "INR", splitType: "EXACT", participants: [{ userId: owner, paid: 0, owed: 1 }, { userId: placeholder, paid: 100, owed: 50 }, { userId: claimer, paid: 1, owed: 50 }] }, createId());
    const link = await createInvite(owner, { type: "DIRECT", placeholderId: placeholder }, createId());
    await claimGroupOrPersonalInvite(claimer, link.token);
    const rows = await db.select().from(expenseParticipants).where(eq(expenseParticipants.expenseId,id));
    expect(rows).toHaveLength(2);
    expect(rows.find(p => p.userId === claimer)).toMatchObject({ paid: 101, owed: 100 });
    const active = await db.select().from(ledgerEntries).where(isNull(ledgerEntries.voidedAt));
    expect(active.every(e => e.debtorId !== e.creditorId && e.debtorId !== placeholder && e.creditorId !== placeholder)).toBe(true);
  });
  it("allows one of two different concurrent claimers and never exposes group balances in previews", async () => {
    const groupId = await createGroup(owner, { name: "Group" }, createId());
    const link = await createInvite(owner, { type: "GROUP_LINK", groupId }, createId());
    expect(await previewInvite(link.token)).toMatchObject({ groupName: "Group", balances: [] });
    await claimGroupOrPersonalInvite(claimer, link.token);
    expect((await getGroup(claimer,groupId)).members.some(p => p.id === claimer)).toBe(true);
    const placeholder = await createPlaceholder(owner, { name: "Once" }, createId());
    const direct = await createInvite(owner, { type: "DIRECT", placeholderId: placeholder }, createId());
    const result = await Promise.allSettled([claimGroupOrPersonalInvite(claimer,direct.token), claimGroupOrPersonalInvite(stranger,direct.token)]);
    expect(result.filter(r => r.status === "fulfilled")).toHaveLength(1);
  });
  it("rejects revoked, expired and unauthorized invitations", async () => {
    const groupId = await createGroup(owner, { name: "Private" }, createId());
    await expect(createInvite(stranger, { type: "GROUP_LINK", groupId }, createId())).rejects.toMatchObject({ statusCode: 404 });
    const link = await createInvite(owner, { type: "GROUP_LINK", groupId }, createId());
    await revokeInvite(owner, link.id);
    await expect(previewInvite(link.token)).rejects.toMatchObject({ statusCode: 404 });
    const expired = await createInvite(owner, { type: "GROUP_LINK", groupId }, createId());
    await db.update(invites).set({ expiresAt: new Date(0) }).where(eq(invites.id,expired.id));
    await expect(claimGroupOrPersonalInvite(claimer,expired.token)).rejects.toMatchObject({ statusCode: 404 });
    expect(await db.select().from(users).where(and(eq(users.id,claimer),eq(users.status,"ACTIVE")))).toHaveLength(1);
  });
});
