import { beforeEach, describe, expect, it } from "vitest";
import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  contacts,
  friendRequests,
  friendships,
  groupMembers,
  users,
} from "@/lib/db/schema";
import {
  findPeople,
  respondFriendRequest,
  sendFriendRequest,
} from "@/lib/domain/people";
import {
  createGroup,
  changeGroupMember,
  updateGroup,
} from "@/lib/domain/groups";
import { createPlaceholder, updateFriend } from "@/lib/domain/friends";
import {
  createInvite,
  claimGroupOrPersonalInvite,
  revokeInvite,
} from "@/lib/domain/invites";
import { createExpense } from "@/lib/domain/expenses";
import { updateProfile } from "@/lib/domain/profile";
import { getProfile } from "@/lib/db/queries/profile";
import { listFriendRequests } from "@/lib/db/queries/people";
import { orderPair } from "@/lib/utils/order-pair";

let owner: string;
let target: string;
let stranger: string;
const email = (id: string) => id + "@example.test";
const request = () =>
  sendFriendRequest(
    owner,
    { userId: target, email: email(target) },
    createId(),
  );
beforeEach(async () => {
  [owner, target, stranger] = [createId(), createId(), createId()];
  await db.insert(users).values(
    [owner, target, stranger].map((id) => ({
      id,
      name: "Same name",
      email: email(id),
      emailVerified: true,
    })),
  );
});

describe("people discovery and connection consent", () => {
  it("paginates the inbox without losing timestamp ties and rejects another viewer's cursor", async () => {
    const peers = Array.from({ length: 31 }, () => createId());
    await db.insert(users).values(
      peers.map((id) => ({
        id,
        name: id,
        email: email(id),
        emailVerified: true,
      })),
    );
    await updateProfile(owner, { discoverableByEmail: true });
    await db.insert(friendRequests).values(
      peers.map((id) => {
        const [low, high] = orderPair(owner, id);
        return {
          userLowId: low,
          userHighId: high,
          requesterId: id,
          source: "EMAIL",
        };
      }),
    );
    const first = await listFriendRequests(owner);
    expect(first.items).toHaveLength(30);
    const second = await listFriendRequests(owner, {
      cursor: first.nextCursor!,
    });
    expect(second.items).toHaveLength(1);
    expect(
      new Set([...first.items, ...second.items].map((row) => row.id)).size,
    ).toBe(31);
    await expect(
      listFriendRequests(stranger, { cursor: first.nextCursor! }),
    ).rejects.toMatchObject({ statusCode: 404 });
    await respondFriendRequest(owner, first.nextCursor!, { action: "DECLINE" });
    expect(
      (await listFriendRequests(owner, { cursor: first.nextCursor! })).items,
    ).toEqual(second.items);
  });

  it("unrelated profile updates never reset discoverability", async () => {
    await updateProfile(target, { discoverableByEmail: true });
    await updateProfile(target, { name: "Updated name" });
    expect((await getProfile(target)).discoverableByEmail).toBe(true);
    await updateProfile(target, { discoverableByEmail: false });
    await updateProfile(target, { phone: "1234" });
    expect((await getProfile(target)).discoverableByEmail).toBe(false);
  });
  it("defaults to private, conceals account existence, and requires complete email opt-in", async () => {
    expect((await getProfile(target)).discoverableByEmail).toBe(false);
    expect(await findPeople(owner, email(target))).toEqual([]);
    expect(await findPeople(owner, email(stranger))).toEqual([]);
    await updateProfile(target, { discoverableByEmail: true });
    expect(await findPeople(owner, "Same name")).toEqual([]);
    expect(await findPeople(owner, target)).toEqual([]);
    expect(
      await findPeople(owner, "  " + email(target).toUpperCase() + "  "),
    ).toEqual([
      {
        id: target,
        name: "Same name",
        relationship: "NONE",
        requestId: null,
        source: "EMAIL",
      },
    ]);
    expect(await findPeople(owner, email(owner))).toEqual([]);
  });

  it("prevents user-ID bypass, guessed email, spoofed group and source fields", async () => {
    await expect(
      sendFriendRequest(owner, { userId: target }, createId()),
    ).rejects.toMatchObject({ statusCode: 404 });
    await updateProfile(target, { discoverableByEmail: true });
    await expect(
      sendFriendRequest(
        owner,
        { userId: target, email: email(stranger) },
        createId(),
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      sendFriendRequest(
        owner,
        { userId: target, ...{ groupId: createId() } },
        createId(),
      ),
    ).rejects.toThrow();
  });

  it("rechecks privacy after a search and on idempotent retries", async () => {
    await updateProfile(target, { discoverableByEmail: true });
    expect(await findPeople(owner, email(target))).toHaveLength(1);
    const key = createId();
    await sendFriendRequest(
      owner,
      { userId: target, email: email(target) },
      key,
    );
    await updateProfile(target, { discoverableByEmail: false });
    expect(await findPeople(owner, email(target))).toEqual([]);
    await expect(
      sendFriendRequest(owner, { userId: target, email: email(target) }, key),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(request()).rejects.toMatchObject({ statusCode: 404 });
    expect((await listFriendRequests(target)).items).toEqual([]);
    await updateProfile(target, { discoverableByEmail: true });
    const [closed] = await db.select().from(friendRequests);
    await expect(
      respondFriendRequest(target, closed!.id, { action: "ACCEPT" }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(await db.select().from(friendships)).toEqual([]);
  });

  it("allows name and nickname searches only for existing friends and active shared groups", async () => {
    const placeholder = await createPlaceholder(
      owner,
      { name: "Local only" },
      createId(),
    );
    await db.insert(contacts).values({
      ownerId: stranger,
      userId: target,
      nickname: "Secret nickname",
    });
    const group = await createGroup(
      owner,
      { name: "Shared", type: "OTHER", currency: "INR" },
      createId(),
    );
    await db.insert(groupMembers).values({ groupId: group, userId: target });
    expect((await findPeople(owner, "Same name")).map((row) => row.id)).toEqual(
      [target],
    );
    expect((await findPeople(owner, "Local only"))[0]?.id).toBe(placeholder);
    expect(await findPeople(owner, "Secret nickname")).toEqual([]);
    expect(await findPeople(owner, "%")).toEqual([]);
    expect(await findPeople(owner, "_")).toEqual([]);
    await updateGroup(owner, group, { archived: true });
    expect(await findPeople(owner, "Same name")).toEqual([]);
  });

  it("pending requests grant no financial permissions and only the recipient may accept", async () => {
    await updateProfile(target, { discoverableByEmail: true });
    const id = await request();
    await expect(
      respondFriendRequest(owner, id, { action: "ACCEPT" }),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      respondFriendRequest(stranger, id, { action: "ACCEPT" }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect((await listFriendRequests(stranger)).items).toEqual([]);
    const input = {
      amount: 100,
      description: "Pending",
      category: "Food" as const,
      date: "2026-11-08",
      currency: "INR" as const,
      splitType: "EQUAL" as const,
      participants: [
        { userId: owner, paid: 100 },
        { userId: target, paid: 0 },
      ],
    };
    await expect(createExpense(owner, input, createId())).rejects.toMatchObject(
      { statusCode: 404 },
    );
    await respondFriendRequest(target, id, { action: "ACCEPT" });
    await respondFriendRequest(target, id, { action: "ACCEPT" });
    const [low, high] = orderPair(owner, target);
    expect(await db.select().from(friendships)).toMatchObject([
      { userLowId: low, userHighId: high, status: "ACCEPTED" },
    ]);
    await expect(createExpense(owner, input, createId())).resolves.toBeTypeOf(
      "string",
    );
  });

  it("serializes duplicate and crossed requests without implicitly accepting", async () => {
    await updateProfile(target, { discoverableByEmail: true });
    await updateProfile(owner, { discoverableByEmail: true });
    const ids = await Promise.all([
      request(),
      request(),
      sendFriendRequest(
        target,
        { userId: owner, email: email(owner) },
        createId(),
      ),
    ]);
    expect(new Set(ids).size).toBe(1);
    expect(await db.select().from(friendships)).toEqual([]);
    expect(await db.select().from(friendRequests)).toHaveLength(1);
  });

  it("preserves idempotency and rejects different bodies with the same key", async () => {
    await updateProfile(target, { discoverableByEmail: true });
    await updateProfile(stranger, { discoverableByEmail: true });
    const key = createId();
    const first = await sendFriendRequest(
      owner,
      { userId: target, email: email(target) },
      key,
    );
    expect(
      await sendFriendRequest(
        owner,
        { userId: target, email: email(target) },
        key,
      ),
    ).toBe(first);
    await expect(
      sendFriendRequest(
        owner,
        { userId: stranger, email: email(stranger) },
        key,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("declining prevents immediate repeat requests and cannot be reversed", async () => {
    await updateProfile(target, { discoverableByEmail: true });
    const id = await request();
    await respondFriendRequest(target, id, { action: "DECLINE" });
    await respondFriendRequest(target, id, { action: "DECLINE" });
    await expect(
      respondFriendRequest(target, id, { action: "ACCEPT" }),
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(request()).rejects.toMatchObject({ statusCode: 409 });
  });

  it("private connection links create requests rather than friendships", async () => {
    const link = await createInvite(target, { type: "PERSONAL" }, createId());
    expect(await claimGroupOrPersonalInvite(owner, link.token)).toEqual({
      destination: "/friends",
    });
    expect(await claimGroupOrPersonalInvite(owner, link.token)).toEqual({
      destination: "/friends",
    });
    expect(await db.select().from(friendships)).toEqual([]);
    const [pending] = (await listFriendRequests(target)).items;
    await updateProfile(target, { discoverableByEmail: false });
    await respondFriendRequest(target, pending!.id, { action: "ACCEPT" });
    expect(await db.select().from(friendships)).toHaveLength(1);
  });

  it("a declined connection link cannot immediately resend but can be used after the cooldown", async () => {
    await updateProfile(target, { discoverableByEmail: true });
    const emailRequest = await request();
    await respondFriendRequest(target, emailRequest, { action: "DECLINE" });
    await updateProfile(target, { discoverableByEmail: false });
    const link = await createInvite(target, { type: "PERSONAL" }, createId());
    await claimGroupOrPersonalInvite(owner, link.token);
    const [pending] = (await listFriendRequests(target)).items;
    await respondFriendRequest(target, pending!.id, { action: "DECLINE" });
    await expect(
      claimGroupOrPersonalInvite(owner, link.token),
    ).rejects.toMatchObject({ statusCode: 409 });
    await db
      .update(friendRequests)
      .set({ respondedAt: new Date(Date.now() - 8 * 86400000) })
      .where(eq(friendRequests.id, pending!.id));
    await expect(
      claimGroupOrPersonalInvite(owner, link.token),
    ).resolves.toEqual({ destination: "/friends" });
    expect((await listFriendRequests(target)).items).toHaveLength(1);
  });

  it("revoked links reject new requests and close their pending requests", async () => {
    const link = await createInvite(target, { type: "PERSONAL" }, createId());
    const id = await sendFriendRequest(
      owner,
      { token: link.token },
      createId(),
    );
    await revokeInvite(target, link.id);
    await expect(
      sendFriendRequest(stranger, { token: link.token }, createId()),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      respondFriendRequest(target, id, { action: "ACCEPT" }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect((await listFriendRequests(target)).items).toEqual([]);
  });

  it("cannot use group or placeholder claim tokens as personal connection links", async () => {
    const placeholder = await createPlaceholder(
      target,
      { name: "Unclaimed" },
      createId(),
    );
    const direct = await createInvite(
      target,
      { type: "DIRECT", placeholderId: placeholder },
      createId(),
    );
    await expect(
      sendFriendRequest(owner, { token: direct.token }, createId()),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(await db.select().from(friendRequests)).toEqual([]);
  });

  it("rechecks shared-group visibility on send and acceptance", async () => {
    const group = await createGroup(
      owner,
      { name: "Shared", type: "OTHER", currency: "INR" },
      createId(),
    );
    await db.insert(groupMembers).values({ groupId: group, userId: target });
    const id = await sendFriendRequest(owner, { userId: target }, createId());
    await changeGroupMember(target, group, { action: "LEAVE" });
    await expect(
      sendFriendRequest(owner, { userId: target }, createId()),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      respondFriendRequest(target, id, { action: "ACCEPT" }),
    ).rejects.toMatchObject({ statusCode: 404 });
    await respondFriendRequest(target, id, { action: "DECLINE" });
  });

  it("honors blocking in either direction even through valid links", async () => {
    const [low, high] = orderPair(owner, target);
    await db.insert(friendships).values({ userLowId: low, userHighId: high });
    const link = await createInvite(target, { type: "PERSONAL" }, createId());
    await updateProfile(target, { discoverableByEmail: true });
    await updateFriend(target, owner, { blocked: true });
    expect(await findPeople(owner, email(target))).toEqual([]);
    expect(await findPeople(target, "Same name")).toEqual([]);
    await expect(
      sendFriendRequest(owner, { token: link.token }, createId()),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it.each(["unverified", "deleted"])(
    "does not discover or connect to an %s account",
    async (state) => {
      await db
        .update(users)
        .set({
          discoverableByEmail: true,
          ...(state === "unverified"
            ? { emailVerified: false }
            : { status: "DELETED" as const, deletedAt: new Date() }),
        })
        .where(eq(users.id, target));
      expect(await findPeople(owner, email(target))).toEqual([]);
      await expect(request()).rejects.toMatchObject({ statusCode: 404 });
    },
  );

  it("limits enumeration and new request spam", async () => {
    for (let index = 0; index < 10; index++)
      await expect(
        sendFriendRequest(stranger, { userId: createId() }, createId()),
      ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      sendFriendRequest(stranger, { userId: createId() }, createId()),
    ).rejects.toMatchObject({ statusCode: 429 });
    for (let index = 0; index < 30; index++)
      await findPeople(owner, "missing@example.test");
    await expect(
      findPeople(owner, "missing@example.test"),
    ).rejects.toMatchObject({ statusCode: 429 });
    const ids = Array.from({ length: 11 }, () => createId());
    await db.insert(users).values(
      ids.map((id) => ({
        id,
        name: id,
        email: email(id),
        emailVerified: true,
        discoverableByEmail: true,
      })),
    );
    for (const id of ids.slice(0, 10))
      await sendFriendRequest(
        owner,
        { userId: id, email: email(id) },
        createId(),
      );
    await expect(
      sendFriendRequest(
        owner,
        { userId: ids[10]!, email: email(ids[10]!) },
        createId(),
      ),
    ).rejects.toMatchObject({ statusCode: 429 });
  });

  it("serializes opt-out against concurrent sends and acceptance", async () => {
    await updateProfile(target, { discoverableByEmail: true });
    await Promise.allSettled([
      request(),
      updateProfile(target, { discoverableByEmail: false }),
    ]);
    expect((await listFriendRequests(target)).items).toEqual([]);
    expect(await db.select().from(friendships)).toEqual([]);
    await expect(request()).rejects.toMatchObject({ statusCode: 404 });
    const pending = await db
      .select()
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.userLowId, orderPair(owner, target)[0]),
          eq(friendRequests.status, "PENDING"),
        ),
      );
    expect(pending).toEqual([]);
  });
});
