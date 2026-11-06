import "server-only";
import { db } from "@/lib/db/client";
import { ledgerEntries, balances } from "@/lib/db/schema";
import { isNull } from "drizzle-orm";
import { orderPair } from "@/lib/utils/order-pair";
export async function reconcileBalances() {
  return db.transaction(async tx => {
    const [entries, cached] = await Promise.all([tx.select().from(ledgerEntries).where(isNull(ledgerEntries.voidedAt)),tx.select().from(balances)]);
    const expected = new Map<string,bigint>();
    for (const entry of entries) {
      const [low,high] = orderPair(entry.debtorId,entry.creditorId);
      const key = [entry.scopeId,low,high,entry.currency].join("\0");
      expected.set(key,(expected.get(key) ?? BigInt(0))+(entry.debtorId === low ? BigInt(entry.amount) : -BigInt(entry.amount)));
    }
    const actual = new Map(cached.map(row => [[row.scopeId,row.userLowId,row.userHighId,row.currency].join("\0"),row.amount]));
    const mismatches = [...new Set([...expected.keys(),...actual.keys()])].filter(key => (expected.get(key) ?? BigInt(0)) !== (actual.get(key) ?? BigInt(0)));
    if (mismatches.length) console.error("[reconciliation] Balance cache mismatches:",mismatches.length);
    return { matched: mismatches.length === 0, mismatchCount: mismatches.length };
  },{ isolationLevel: "repeatable read", accessMode: "read only" });
}
