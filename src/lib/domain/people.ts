import "server-only";
import { createHash } from "node:crypto";
import { and, eq, gte, inArray, isNull } from "drizzle-orm";
import { db, type DbTx } from "@/lib/db/client";
import {
  friendRequests,
  friendships,
  idempotencyRecords,
  invites,
  users,
} from "@/lib/db/schema";
import { assertActiveViewer, assertCanConnect } from "@/lib/auth/guards";
import { ConflictError, NotFoundError } from "@/lib/utils/errors";
import { enforceLimit } from "@/lib/rate-limit/consume";
import { peoplePolicies } from "@/lib/rate-limit/policies";
import { orderPair } from "@/lib/utils/order-pair";
import { searchPeople, sharedGroupPeople } from "@/lib/db/queries/people";
import {
  createFriendRequestSchema,
  peopleSearchSchema,
  respondFriendRequestSchema,
  type CreateFriendRequestInput,
  type RespondFriendRequestInput,
} from "@/lib/validation/people";
import { reserveIdempotency } from "./idempotency";

export async function findPeople(viewerId: string, raw: string) {
  const { query } = peopleSearchSchema.parse({ query: raw });
  await enforceLimit(viewerId, peoplePolicies.search);
  return db.transaction(async (tx) => {
    await assertActiveViewer(viewerId, tx);
    return searchPeople(viewerId, query, tx);
  });
}

async function lockPeople(viewerId: string, otherId: string, tx: DbTx) {
  if (viewerId === otherId) throw new NotFoundError();
  const people = await tx
    .select()
    .from(users)
    .where(inArray(users.id, [viewerId, otherId]))
    .orderBy(users.id)
    .for("update");
  await assertActiveViewer(viewerId, tx);
  const other = people.find((person) => person.id === otherId);
  if (
    !other ||
    other.status !== "ACTIVE" ||
    !other.emailVerified ||
    other.deletedAt
  )
    throw new NotFoundError();
  await assertCanConnect(viewerId, otherId, tx);
  return other;
}

async function connectionLink(id: string, otherId: string, tx: DbTx) {
  const [invite] = await tx
    .select()
    .from(invites)
    .where(
      and(
        eq(invites.id, id),
        eq(invites.inviterId, otherId),
        eq(invites.type, "PERSONAL"),
        isNull(invites.revokedAt),
      ),
    )
    .for("share");
  if (
    !invite ||
    (invite.expiresAt && invite.expiresAt <= new Date()) ||
    (invite.maxUses !== null && invite.useCount >= invite.maxUses)
  )
    throw new NotFoundError();
  return invite;
}

async function sharesGroup(viewerId: string, otherId: string, tx: DbTx) {
  const peers = await sharedGroupPeople(viewerId, tx).for("share");
  return peers.some((peer) => peer.id === otherId);
}

export async function sendFriendRequest(
  viewerId: string,
  raw: CreateFriendRequestInput,
  key: string,
) {
  const input = createFriendRequestSchema.parse(raw);
  await enforceLimit(viewerId, peoplePolicies.request);
  return db.transaction(async (tx) => {
    const [link] = input.token
      ? await tx
          .select({ id: invites.id, inviterId: invites.inviterId })
          .from(invites)
          .where(
            eq(
              invites.tokenHash,
              createHash("sha256").update(input.token).digest("hex"),
            ),
          )
      : [];
    const otherId = input.token ? link?.inviterId : input.userId;
    if (!otherId) throw new NotFoundError();
    const other = await lockPeople(viewerId, otherId, tx);
    const source = input.token
      ? "LINK"
      : (await sharesGroup(viewerId, otherId, tx))
        ? "CONTEXT"
        : "EMAIL";
    if (source === "LINK") await connectionLink(link!.id, otherId, tx);
    if (
      source === "EMAIL" &&
      (!input.email ||
        other.email !== input.email ||
        !other.discoverableByEmail)
    )
      throw new NotFoundError();
    const reservation = await reserveIdempotency(
      tx,
      viewerId,
      "friend-request",
      key,
      input,
    );
    if (reservation.replayed) return reservation.id;
    const [low, high] = orderPair(viewerId, otherId);
    const pairFilter = and(
      eq(friendRequests.userLowId, low),
      eq(friendRequests.userHighId, high),
    );
    const [friend] = await tx
      .select()
      .from(friendships)
      .where(
        and(eq(friendships.userLowId, low), eq(friendships.userHighId, high)),
      );
    if (friend?.status === "ACCEPTED")
      throw new ConflictError("You are already friends");
    const [existing] = await tx
      .select()
      .from(friendRequests)
      .where(and(pairFilter, eq(friendRequests.status, "PENDING")));
    if (existing) {
      await tx
        .update(idempotencyRecords)
        .set({ resourceId: existing.id })
        .where(
          and(
            eq(idempotencyRecords.viewerId, viewerId),
            eq(idempotencyRecords.operation, "friend-request"),
            eq(idempotencyRecords.key, key),
          ),
        );
      return existing.id;
    }
    const [declined] = await tx
      .select({ id: friendRequests.id })
      .from(friendRequests)
      .where(
        and(
          pairFilter,
          eq(friendRequests.requesterId, viewerId),
          eq(friendRequests.status, "DECLINED"),
          gte(friendRequests.respondedAt, new Date(Date.now() - 7 * 86400000)),
          source === "LINK" ? eq(friendRequests.inviteId, link!.id) : undefined,
        ),
      )
      .limit(1);
    if (declined) throw new ConflictError("A new request cannot be sent yet");
    await tx.insert(friendRequests).values({
      id: reservation.id,
      userLowId: low,
      userHighId: high,
      requesterId: viewerId,
      source,
      inviteId: source === "LINK" ? link!.id : null,
    });
    return reservation.id;
  });
}

export async function respondFriendRequest(
  viewerId: string,
  id: string,
  raw: RespondFriendRequestInput,
) {
  const { action } = respondFriendRequestSchema.parse(raw);
  return db.transaction(async (tx) => {
    const [initial] = await tx
      .select()
      .from(friendRequests)
      .where(eq(friendRequests.id, id));
    if (
      !initial ||
      initial.requesterId === viewerId ||
      ![initial.userLowId, initial.userHighId].includes(viewerId)
    )
      throw new NotFoundError();
    await lockPeople(viewerId, initial.requesterId, tx);
    const [request] = await tx
      .select()
      .from(friendRequests)
      .where(eq(friendRequests.id, id))
      .for("update");
    if (!request) throw new NotFoundError();
    const status = action === "ACCEPT" ? "ACCEPTED" : "DECLINED";
    if (request.status !== "PENDING") {
      if (request.status !== status)
        throw new ConflictError("This request has already been answered");
      return request.id;
    }
    if (action === "ACCEPT") {
      if (request.source === "EMAIL") {
        const [recipient] = await tx
          .select({ discoverable: users.discoverableByEmail })
          .from(users)
          .where(eq(users.id, viewerId));
        if (!recipient?.discoverable) throw new NotFoundError();
      }
      if (request.source === "LINK")
        await connectionLink(request.inviteId!, viewerId, tx);
      if (
        request.source === "CONTEXT" &&
        !(await sharesGroup(viewerId, request.requesterId, tx))
      )
        throw new NotFoundError();
      await tx
        .insert(friendships)
        .values({
          userLowId: request.userLowId,
          userHighId: request.userHighId,
        })
        .onConflictDoNothing();
      const [pair] = await tx
        .select()
        .from(friendships)
        .where(
          and(
            eq(friendships.userLowId, request.userLowId),
            eq(friendships.userHighId, request.userHighId),
          ),
        );
      if (pair?.status !== "ACCEPTED") throw new NotFoundError();
    }
    await tx
      .update(friendRequests)
      .set({ status, respondedAt: new Date() })
      .where(eq(friendRequests.id, request.id));
    return request.id;
  });
}
