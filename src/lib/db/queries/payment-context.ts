import "server-only";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  balances,
  friendships,
  groupMembers,
  groups,
  users,
} from "@/lib/db/schema";
import { toSafeNumber } from "@/lib/utils/to-safe-number";

export interface PaymentPerson {
  id: string;
  name: string;
  upiId: string | null;
  net: number;
  restricted: boolean;
}
export interface PaymentScope {
  id: string;
  name: string;
  currency: string;
  people: PaymentPerson[];
}

export async function getPaymentContext(
  viewerId: string,
): Promise<PaymentScope[]> {
  const [pairs, memberships, debts] = await Promise.all([
    db
      .select()
      .from(friendships)
      .where(
        or(
          eq(friendships.userLowId, viewerId),
          eq(friendships.userHighId, viewerId),
        ),
      ),
    db
      .select({ group: groups, status: groupMembers.status })
      .from(groupMembers)
      .innerJoin(groups, eq(groups.id, groupMembers.groupId))
      .where(and(eq(groupMembers.userId, viewerId), isNull(groups.archivedAt))),
    db
      .select()
      .from(balances)
      .where(
        or(eq(balances.userLowId, viewerId), eq(balances.userHighId, viewerId)),
      ),
  ]);
  const groupIds = memberships.map((row) => row.group.id);
  const [members, groupDebts] = await Promise.all([
    groupIds.length
      ? db
          .select({
            groupId: groupMembers.groupId,
            status: groupMembers.status,
            person: users,
          })
          .from(groupMembers)
          .innerJoin(users, eq(users.id, groupMembers.userId))
          .where(inArray(groupMembers.groupId, groupIds))
      : [],
    groupIds.length
      ? db.select().from(balances).where(inArray(balances.scopeId, groupIds))
      : [],
  ]);
  const friendIds = pairs.map((pair) =>
    pair.userLowId === viewerId ? pair.userHighId : pair.userLowId,
  );
  const friends = friendIds.length
    ? await db.select().from(users).where(inArray(users.id, friendIds))
    : [];
  const available = (person: typeof users.$inferSelect) =>
    person.status !== "DELETED" && !person.deletedAt;
  const blocked = (id: string) =>
    pairs.some(
      (pair) =>
        (pair.userLowId === id || pair.userHighId === id) &&
        pair.status === "BLOCKED",
    );
  const net = (scopeId: string, id: string, currency: string) => {
    const row = debts.find(
      (debt) =>
        debt.scopeId === scopeId &&
        debt.currency === currency &&
        (debt.userLowId === id || debt.userHighId === id),
    );
    return row
      ? toSafeNumber(row.userLowId === viewerId ? -row.amount : row.amount)
      : 0;
  };
  return [
    {
      id: "direct",
      name: "Direct",
      currency: "INR",
      people: friends.filter(available).map((person) => ({
        id: person.id,
        name: person.name,
        upiId: person.upiId,
        net: net("direct", person.id, "INR"),
        restricted: blocked(person.id),
      })),
    },
    ...memberships.flatMap(({ group, status }) => {
      const people = members
        .filter(
          (member) =>
            member.groupId === group.id &&
            member.person.id !== viewerId &&
            available(member.person),
        )
        .filter((member) =>
          status !== "ACTIVE"
            ? net(group.id, member.person.id, group.currency) !== 0
            : member.status === "ACTIVE" ||
              groupDebts.some(
                (debt) =>
                  debt.scopeId === group.id &&
                  debt.amount !== BigInt(0) &&
                  (debt.userLowId === member.person.id ||
                    debt.userHighId === member.person.id),
              ),
        )
        .map((member) => ({
          id: member.person.id,
          name: member.person.name,
          upiId: member.person.upiId,
          net: net(group.id, member.person.id, group.currency),
          restricted:
            status !== "ACTIVE" ||
            member.status !== "ACTIVE" ||
            blocked(member.person.id),
        }));
      return status === "ACTIVE" || people.length
        ? [{ id: group.id, name: group.name, currency: group.currency, people }]
        : [];
    }),
  ];
}
