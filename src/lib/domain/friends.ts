import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, contacts, friendships, groupMembers } from "@/lib/db/schema";
import { assertActiveViewer, assertGroupAdmin } from "@/lib/auth/guards";
import { orderPair } from "@/lib/utils/order-pair";
import { NotFoundError } from "@/lib/utils/errors";
import {
  placeholderSchema,
  friendUpdateSchema,
  type PlaceholderInput,
  type FriendUpdateInput,
} from "@/lib/validation/invite";
import { reserveIdempotency } from "./idempotency";
export async function createPlaceholder(
  viewerId: string,
  raw: PlaceholderInput,
  key: string,
) {
  const input = placeholderSchema.parse(raw);
  return db.transaction(async (tx) => {
    await assertActiveViewer(viewerId, tx);
    if (input.groupId) await assertGroupAdmin(viewerId, input.groupId, tx);
    const reservation = await reserveIdempotency(
      tx,
      viewerId,
      "placeholder",
      key,
      input,
    );
    if (reservation.replayed) return reservation.id;
    const id = reservation.id;
    await tx.insert(users).values({
      id,
      name: input.name,
      email: "placeholder+" + id + "@spendingdiary.invalid",
      status: "INVITED",
      phone: input.phone ?? null,
    });
    const [low, high] = orderPair(viewerId, id);
    await tx.insert(friendships).values({ userLowId: low, userHighId: high });
    await tx
      .insert(contacts)
      .values({ ownerId: viewerId, userId: id, nickname: input.name });
    if (input.groupId)
      await tx
        .insert(groupMembers)
        .values({ groupId: input.groupId, userId: id });
    return id;
  });
}
export async function updateFriend(
  viewerId: string,
  otherId: string,
  raw: FriendUpdateInput,
) {
  const input = friendUpdateSchema.parse(raw);
  const [low, high] = orderPair(viewerId, otherId);
  await db.transaction(async (tx) => {
    await assertActiveViewer(viewerId, tx);
    const [friend] = await tx
      .select()
      .from(friendships)
      .where(
        and(eq(friendships.userLowId, low), eq(friendships.userHighId, high)),
      )
      .for("update");
    if (
      !friend ||
      (input.blocked === false &&
        friend.status === "BLOCKED" &&
        friend.blockedById !== viewerId)
    )
      throw new NotFoundError();
    if (input.blocked !== undefined)
      await tx
        .update(friendships)
        .set({
          status: input.blocked ? "BLOCKED" : "ACCEPTED",
          blockedById: input.blocked ? viewerId : null,
        })
        .where(
          and(eq(friendships.userLowId, low), eq(friendships.userHighId, high)),
        );
    if (input.nickname !== undefined)
      await tx
        .insert(contacts)
        .values({
          ownerId: viewerId,
          userId: otherId,
          nickname: input.nickname ?? "",
        })
        .onConflictDoUpdate({
          target: [contacts.ownerId, contacts.userId],
          set: { nickname: input.nickname ?? "" },
        });
  });
}
