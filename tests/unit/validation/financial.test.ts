import { describe, expect, it } from "vitest";
import { createExpenseSchema, editExpenseSchema } from "@/lib/validation/expense";
import { createSettlementSchema } from "@/lib/validation/settlement";
import { mapError, requireIdempotencyKey } from "@/lib/api/route-handler";
import { toSafeNumber } from "@/lib/utils/to-safe-number";

const expense = { description: "Dinner", category: "Food", amount: 10001, currency: "INR", date: "2026-10-29", splitType: "EQUAL", participants: [{ userId: "a", paid: 10001 }, { userId: "b", paid: 0 }] };
describe("financial validation", () => {
  it.each([0, -1, 10.5, 2147483648, Number.MAX_SAFE_INTEGER])("rejects invalid row amount %s", amount => {
    expect(createExpenseSchema.safeParse({ ...expense, amount }).success).toBe(false);
  });
  it.each(["2026-02-31", "2025-02-29", "2026-13-01", "2026-10-29T00:00:00Z"])("rejects invalid calendar date %s", date => {
    expect(createExpenseSchema.safeParse({ ...expense, date }).success).toBe(false);
  });
  it("accepts a leap day and the integer maximum", () => {
    expect(createExpenseSchema.parse({ ...expense, amount: 2147483647, date: "2024-02-29", participants: [{ userId: "a", paid: 2147483647 }] }).amount).toBe(2147483647);
  });
  it("rejects duplicate participants", () => {
    expect(createExpenseSchema.safeParse({ ...expense, participants: [{ userId: "a", paid: 10001 }, { userId: "a", paid: 0 }] }).success).toBe(false);
  });
  it("rejects unsupported currency", () => expect(createExpenseSchema.safeParse({ ...expense, currency: "ZZZ" }).success).toBe(false));
  it("rejects unbalanced paid and exact owed totals as domain errors", () => {
    for (const input of [
      { ...expense, participants: [{ userId: "a", paid: 10000 }] },
      { ...expense, splitType: "EXACT", participants: [{ userId: "a", paid: 10001, owed: 1 }] },
    ]) {
      const result = createExpenseSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) expect(mapError(result.error).status).toBe(422);
    }
  });
  it("accepts metadata-only edits but requires version", () => {
    expect(editExpenseSchema.parse({ version: 1, description: "New" })).toEqual({ version: 1, description: "New" });
    expect(editExpenseSchema.safeParse({ description: "New" }).success).toBe(false);
  });
  it("bounds settlement amounts", () => {
    expect(createSettlementSchema.safeParse({ fromUserId: "a", toUserId: "b", currency: "INR", amount: 2147483648, date: "2026-10-29", method: "CASH" }).success).toBe(false);
  });
  it("rejects oversized participant lists", () => {
    expect(createExpenseSchema.safeParse({ ...expense, participants: Array.from({ length: 101 }, (_, i) => ({ userId: String(i), paid: i === 0 ? 10001 : 0 })) }).success).toBe(false);
  });
  it("maps JSON and missing keys to 400", () => {
    expect(mapError(new SyntaxError()).status).toBe(400);
    try { requireIdempotencyKey(new Request("http://localhost")); } catch (error) { expect(mapError(error).status).toBe(400); }
  });
  it("refuses unsafe bigint serialization", () => {
    expect(toSafeNumber(BigInt(2147483647))).toBe(2147483647);
    expect(() => toSafeNumber(BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1))).toThrow(RangeError);
  });
});
