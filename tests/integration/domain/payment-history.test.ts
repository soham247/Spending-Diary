import { beforeEach, describe, it, expect } from "vitest";
import { createId } from "@paralleldrive/cuid2";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { createInvite, claimGroupOrPersonalInvite } from "@/lib/domain/invites";
import {
  createSettlement,
  deleteSettlement,
  restoreSettlement,
} from "@/lib/domain/settlements";
import { listSettlements } from "@/lib/db/queries/settlements";
let owner: string;
let member: string;
let outsider: string;
beforeEach(async () => {
  [owner, member, outsider] = [createId(), createId(), createId()];
  await db.insert(users).values(
    [owner, member, outsider].map((id) => ({
      id,
      name: id,
      email: id + "@example.test",
      emailVerified: true,
    })),
  );
  const invite = await createInvite(owner, { type: "PERSONAL" }, createId());
  await claimGroupOrPersonalInvite(member, invite.token);
});
describe("payment history", () => {
  it("paginates date ties, scopes cursors and restores deleted payments", async () => {
    const ids = [];
    for (let i = 0; i < 31; i++)
      ids.push(
        await createSettlement(
          owner,
          {
            fromUserId: owner,
            toUserId: member,
            amount: 1,
            currency: "INR",
            date: "2026-10-29",
            method: "CASH",
          },
          createId(),
        ),
      );
    const first = await listSettlements(owner, { friendId: member });
    const second = await listSettlements(owner, {
      friendId: member,
      cursor: first.nextCursor!,
    });
    expect(first.items).toHaveLength(30);
    expect(second.items).toHaveLength(1);
    expect(
      new Set([...first.items, ...second.items].map((row) => row.id)),
    ).toEqual(new Set(ids));
    expect(
      (await listSettlements(outsider, { cursor: first.items[0]!.id })).items,
    ).toEqual([]);
    const id = first.items[0]!.id;
    await deleteSettlement(owner, id);
    expect(
      (await listSettlements(owner, { deleted: "true" })).items,
    ).toMatchObject([{ id, canEdit: true }]);
    await restoreSettlement(member, id);
    expect(
      (await listSettlements(owner, { deleted: "true" })).items,
    ).toHaveLength(0);
  });
});
