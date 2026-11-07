import "server-only";
import { and, eq, gte, lt, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { expenses, expenseParticipants } from "@/lib/db/schema";
import { insightsInputSchema } from "@/lib/validation/insights";
import { toSafeNumber } from "@/lib/utils/to-safe-number";
export async function getInsights(
  viewerId: string,
  raw: { month: string; kind?: "PERSONAL" | "SHARED" },
) {
  const input = insightsInputSchema.parse(raw);
  const [year, month] = input.month.split("-").map(Number) as [number, number];
  const previous = new Date(Date.UTC(year, month - 2, 1))
    .toISOString()
    .slice(0, 7);
  const next = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);
  const rows = await db
    .select({
      date: expenses.date,
      category: expenses.category,
      currency: expenses.currency,
      owed: expenseParticipants.owed,
    })
    .from(expenseParticipants)
    .innerJoin(expenses, eq(expenses.id, expenseParticipants.expenseId))
    .where(
      and(
        eq(expenseParticipants.userId, viewerId),
        isNull(expenses.deletedAt),
        gte(expenses.date, previous + "-01"),
        lt(expenses.date, next + "-01"),
        input.kind ? eq(expenses.kind, input.kind) : undefined,
      ),
    );
  const currencies = [...new Set(rows.map((r) => r.currency))];
  return currencies.map((currency) => {
    const current = rows.filter(
      (r) => r.currency === currency && r.date.startsWith(input.month),
    );
    const total = current.reduce((sum, r) => sum + BigInt(r.owed), BigInt(0));
    const prior = rows
      .filter((r) => r.currency === currency && r.date.startsWith(previous))
      .reduce((sum, r) => sum + BigInt(r.owed), BigInt(0));
    const categories = [...new Set(current.map((r) => r.category))]
      .map((category) => ({
        category,
        amount: toSafeNumber(
          current
            .filter((r) => r.category === category)
            .reduce((sum, r) => sum + BigInt(r.owed), BigInt(0)),
        ),
      }))
      .sort((a, b) => b.amount - a.amount);
    return {
      currency,
      total: toSafeNumber(total),
      previousTotal: toSafeNumber(prior),
      change: toSafeNumber(total - prior),
      categories,
    };
  });
}
