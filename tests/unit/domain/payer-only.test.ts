import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  buildExpenseDraft,
  expenseDraftSchema,
  previewDraft,
} from "@/lib/validation/expense-draft";
import { computeLedgerEdges } from "@/lib/domain/splits";
import { createExpenseSchema } from "@/lib/validation/expense";
import { amountInputValue } from "@/lib/validation/personal-expense";

function draft(
  total = 9000,
  splitType: "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES" = "EQUAL",
) {
  return {
    amount: amountInputValue(total),
    description: "Paid for friends",
    category: "Food" as const,
    date: "2026-10-31",
    notes: "",
    splitType,
    payerId: "a",
    multiplePayers: false,
    people: [
      { userId: "a", selected: false, paid: "0", value: "1" },
      {
        userId: "b",
        selected: true,
        paid: "0",
        value:
          splitType === "EXACT"
            ? amountInputValue(Math.floor(total / 2))
            : splitType === "PERCENTAGE"
              ? "50"
              : "1",
      },
      {
        userId: "c",
        selected: true,
        paid: "0",
        value:
          splitType === "EXACT"
            ? amountInputValue(total - Math.floor(total / 2))
            : splitType === "PERCENTAGE"
              ? "50"
              : "1",
      },
    ],
  };
}

describe("payer outside the cost split", () => {
  it.each(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"] as const)(
    "keeps A paid 90 and B/C owed 45 for %s",
    (splitType) => {
      const result = buildExpenseDraft(
        "a",
        null,
        expenseDraftSchema.parse(draft(9000, splitType)),
      );
      expect(result.input.participants[0]).toMatchObject({
        userId: "a",
        paid: 9000,
        includedInSplit: false,
      });
      expect(result.shares).toEqual([
        { userId: "a", owed: 0 },
        { userId: "b", owed: 4500 },
        { userId: "c", owed: 4500 },
      ]);
      expect(
        previewDraft("a", null, draft(9000, splitType)).remainders?.paid,
      ).toBe(0);
      expect(previewDraft("a", null, draft(9000, splitType)).error).toBeNull();
    },
  );

  it("supports multiple payers who are both outside the split", () => {
    const raw = draft();
    raw.multiplePayers = true;
    raw.people[0].paid = "60";
    raw.people.push({ userId: "d", selected: false, paid: "30", value: "1" });
    const result = buildExpenseDraft("a", null, expenseDraftSchema.parse(raw));
    expect(result.input.participants.map((p) => p.paid)).toEqual([
      6000, 0, 0, 3000,
    ]);
    expect(result.shares.map((p) => p.owed)).toEqual([0, 4500, 4500, 0]);
  });

  it("requires at least one cost sharer and actual viewer participation", () => {
    const raw = draft();
    raw.people.forEach((p) => {
      p.selected = false;
    });
    expect(previewDraft("a", null, raw).error).toContain("at least one");
    const unrelated = draft();
    unrelated.payerId = "b";
    expect(previewDraft("a", null, unrelated).error).toContain("pay or share");
  });

  it("rejects a nonzero share for someone marked outside the split", () => {
    expect(
      createExpenseSchema.safeParse({
        description: "Invalid",
        category: "Food",
        amount: 9000,
        currency: "INR",
        date: "2026-10-31",
        splitType: "EXACT",
        participants: [
          { userId: "a", paid: 9000, owed: 1, includedInSplit: false },
          { userId: "b", paid: 0, owed: 8999 },
        ],
      }).success,
    ).toBe(false);
  });

  it("preserves every minor unit and allocates all debt to the excluded payer", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000000 }), (total) => {
        for (const splitType of [
          "EQUAL",
          "EXACT",
          "PERCENTAGE",
          "SHARES",
        ] as const) {
          const result = buildExpenseDraft(
            "a",
            null,
            expenseDraftSchema.parse(draft(total, splitType)),
          );
          const edges = computeLedgerEdges(
            result.input.participants.map((p) => ({
              ...p,
              owed: result.shares.find((s) => s.userId === p.userId)!.owed,
            })),
          );
          expect(result.shares.find((p) => p.userId === "a")?.owed).toBe(0);
          expect(result.shares.reduce((sum, p) => sum + p.owed, 0)).toBe(total);
          expect(edges.reduce((sum, edge) => sum + edge.amount, 0)).toBe(total);
          expect(edges.every((edge) => edge.creditorId === "a")).toBe(true);
        }
      }),
    );
  });
});
