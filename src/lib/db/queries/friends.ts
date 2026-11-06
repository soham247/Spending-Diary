import "server-only";
import { eq, or, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, friendships, contacts, balances } from "@/lib/db/schema";
import { listSettlements } from "./settlements";
import { listExpenses } from "./expenses";
import { NotFoundError } from "@/lib/utils/errors";
import { toSafeNumber } from "@/lib/utils/to-safe-number";
import { orderPair } from "@/lib/utils/order-pair";
export async function listFriends(viewerId: string) {
  const pairs = await db.select().from(friendships).where(or(eq(friendships.userLowId, viewerId), eq(friendships.userHighId, viewerId)));
  if (!pairs.length) return [];
  const ids = pairs.map(pair => pair.userLowId === viewerId ? pair.userHighId : pair.userLowId);
  const [people, names, debts] = await Promise.all([
    db.select({ id: users.id, name: users.name, status: users.status, upiId: users.upiId }).from(users).where(inArray(users.id, ids)),
    db.select().from(contacts).where(eq(contacts.ownerId, viewerId)),
    db.select().from(balances).where(or(eq(balances.userLowId, viewerId), eq(balances.userHighId, viewerId))),
  ]);
  return people.map(person => ({ ...person, name: names.find(n => n.userId === person.id)?.nickname || person.name, blocked: pairs.find(p => p.userLowId === person.id || p.userHighId === person.id)?.status === "BLOCKED", balances: debts.filter(b => b.userLowId === person.id || b.userHighId === person.id).map(b => ({ ...b, amount: toSafeNumber(b.amount), net: toSafeNumber(b.userLowId === viewerId ? -b.amount : b.amount) })) }));
}
export async function getFriend(viewerId: string, otherId: string) {
  const people = await listFriends(viewerId);
  const friend = people.find(p => p.id === otherId);
  if (!friend) throw new NotFoundError();
  const [rows, payments] = await Promise.all([
    listExpenses(viewerId,{ friendId: otherId }),
    listSettlements(viewerId, { friendId: otherId })
  ]);
  const [low, high] = orderPair(viewerId, otherId);
  return { ...friend, expenses: rows.items, settlements: payments.items, pair: { low, high } };
}
