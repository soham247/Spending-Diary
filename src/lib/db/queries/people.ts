import "server-only";
import { and, desc, eq, ilike, inArray, isNull, lt, ne, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { db, type Database, type DbTx } from "@/lib/db/client";
import {
  contacts,
  friendRequests,
  friendships,
  groupMembers,
  groups,
  users,
} from "@/lib/db/schema";
import {
  peopleSearchSchema,
  type PersonSearchResult,
} from "@/lib/validation/people";
import { isPlaceholderEmail } from "@/lib/utils/email";
import { friendRequestListSchema } from "@/lib/validation/people";
import { NotFoundError } from "@/lib/utils/errors";

export function sharedGroupPeople(viewerId: string, tx: DbTx | Database = db) {
  const peers = alias(groupMembers, "search_peers");
  return tx
    .select({ id: peers.userId })
    .from(groupMembers)
    .innerJoin(peers, eq(peers.groupId, groupMembers.groupId))
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(
      and(
        eq(groupMembers.userId, viewerId),
        eq(groupMembers.status, "ACTIVE"),
        eq(peers.status, "ACTIVE"),
        isNull(groups.archivedAt),
      ),
    );
}

export async function searchPeople(
  viewerId: string,
  raw: string,
  tx: DbTx | Database = db,
): Promise<PersonSearchResult[]> {
  const { query } = peopleSearchSchema.parse({ query: raw });
  const email = query.toLowerCase();
  const pattern = "%" + query.replace(/[\\%_]/g, "\\$&") + "%";
  const exactEmail =
    z.email().safeParse(email).success && !isPlaceholderEmail(email);
  const connected = eq(friendships.status, "ACCEPTED");
  const shared = inArray(users.id, sharedGroupPeople(viewerId, tx));
  const rows = await tx
    .select({
      id: users.id,
      name: users.name,
      nickname: contacts.nickname,
      friendship: friendships.status,
      requestId: friendRequests.id,
      requesterId: friendRequests.requesterId,
      shared,
    })
    .from(users)
    .leftJoin(
      friendships,
      or(
        and(
          eq(friendships.userLowId, viewerId),
          eq(friendships.userHighId, users.id),
        ),
        and(
          eq(friendships.userHighId, viewerId),
          eq(friendships.userLowId, users.id),
        ),
      ),
    )
    .leftJoin(
      contacts,
      and(eq(contacts.ownerId, viewerId), eq(contacts.userId, users.id)),
    )
    .leftJoin(
      friendRequests,
      and(
        or(
          and(
            eq(friendRequests.userLowId, viewerId),
            eq(friendRequests.userHighId, users.id),
          ),
          and(
            eq(friendRequests.userHighId, viewerId),
            eq(friendRequests.userLowId, users.id),
          ),
        ),
        eq(friendRequests.status, "PENDING"),
      ),
    )
    .where(
      and(
        ne(users.id, viewerId),
        isNull(users.deletedAt),
        or(isNull(friendships.status), ne(friendships.status, "BLOCKED")),
        or(
          and(eq(users.status, "ACTIVE"), eq(users.emailVerified, true)),
          and(eq(users.status, "INVITED"), connected),
        ),
        or(
          and(
            or(connected, shared),
            or(
              ilike(users.name, pattern),
              ilike(contacts.nickname, pattern),
              exactEmail ? eq(users.email, email) : undefined,
            ),
          ),
          exactEmail
            ? and(
                eq(users.email, email),
                eq(users.discoverableByEmail, true),
                eq(users.status, "ACTIVE"),
                eq(users.emailVerified, true),
              )
            : undefined,
        ),
      ),
    )
    .orderBy(users.name, users.id)
    .limit(30);
  return rows.map((row) => ({
    id: row.id,
    name: row.nickname || row.name,
    relationship:
      row.friendship === "ACCEPTED"
        ? "FRIEND"
        : row.requestId
          ? row.requesterId === viewerId
            ? "OUTGOING"
            : "INCOMING"
          : "NONE",
    requestId: row.requestId,
    source: row.friendship === "ACCEPTED" || row.shared ? "CONTEXT" : "EMAIL",
  }));
}

export async function listFriendRequests(
  viewerId: string,
  raw: { cursor?: string } = {},
) {
  const { cursor } = friendRequestListSchema.parse(raw);
  const visible = or(
    eq(friendRequests.userLowId, viewerId),
    eq(friendRequests.userHighId, viewerId),
  );
  const [anchor] = cursor
    ? await db
        .select({ id: friendRequests.id, createdAt: friendRequests.createdAt })
        .from(friendRequests)
        .where(and(visible, eq(friendRequests.id, cursor)))
    : [];
  if (cursor && !anchor) throw new NotFoundError();
  const cursorRequest = alias(friendRequests, "cursor_request");
  const anchorTime = db
    .select({ createdAt: cursorRequest.createdAt })
    .from(cursorRequest)
    .where(eq(cursorRequest.id, cursor ?? ""));
  const other = alias(users, "request_other");
  const rows = await db
    .select({
      id: friendRequests.id,
      userLowId: friendRequests.userLowId,
      userHighId: friendRequests.userHighId,
      requesterId: friendRequests.requesterId,
      name: other.name,
    })
    .from(friendRequests)
    .innerJoin(
      other,
      or(
        and(
          eq(friendRequests.userLowId, viewerId),
          eq(other.id, friendRequests.userHighId),
        ),
        and(
          eq(friendRequests.userHighId, viewerId),
          eq(other.id, friendRequests.userLowId),
        ),
      ),
    )
    .leftJoin(
      friendships,
      and(
        eq(friendships.userLowId, friendRequests.userLowId),
        eq(friendships.userHighId, friendRequests.userHighId),
      ),
    )
    .where(
      and(
        or(
          eq(friendRequests.userLowId, viewerId),
          eq(friendRequests.userHighId, viewerId),
        ),
        eq(friendRequests.status, "PENDING"),
        eq(other.status, "ACTIVE"),
        eq(other.emailVerified, true),
        isNull(other.deletedAt),
        or(isNull(friendships.status), ne(friendships.status, "BLOCKED")),
        anchor
          ? or(
              lt(friendRequests.createdAt, anchorTime),
              and(
                eq(friendRequests.createdAt, anchorTime),
                lt(friendRequests.id, anchor.id),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(desc(friendRequests.createdAt), desc(friendRequests.id))
    .limit(31);
  return {
    items: rows.slice(0, 30).map((row) => ({
      id: row.id,
      userId: row.userLowId === viewerId ? row.userHighId : row.userLowId,
      name: row.name,
      incoming: row.requesterId !== viewerId,
    })),
    nextCursor: rows.length > 30 ? rows[29]!.id : null,
  };
}
