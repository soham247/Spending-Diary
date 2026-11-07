import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  expenseDraftSchema,
  buildExpenseDraft,
  previewDraft,
  changeExpensePeople,
  type ExpenseDraftInput,
} from "@/lib/validation/expense-draft";
import { amountInputValue } from "@/lib/validation/personal-expense";
describe("expense form financial payloads", () => {
  it("preserves integer totals across every split mode", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000000 }), (total) => {
        for (const splitType of [
          "EQUAL",
          "EXACT",
          "PERCENTAGE",
          "SHARES",
        ] as const) {
          const input = expenseDraftSchema.parse({
            amount: amountInputValue(total),
            description: "Draft",
            category: "Food",
            date: "2026-10-29",
            notes: "",
            splitType,
            payerId: "a",
            multiplePayers: false,
            people: [
              {
                userId: "a",
                selected: true,
                paid: "0",
                value:
                  splitType === "EXACT"
                    ? amountInputValue(total)
                    : splitType === "PERCENTAGE"
                      ? "60"
                      : "2",
              },
              {
                userId: "b",
                selected: true,
                paid: "0",
                value:
                  splitType === "EXACT"
                    ? "0"
                    : splitType === "PERCENTAGE"
                      ? "40"
                      : "1",
              },
            ],
          });
          const result = buildExpenseDraft("a", null, input);
          expect(result.shares.reduce((sum, p) => sum + p.owed, 0)).toBe(total);
          expect(
            result.input.participants.reduce((sum, p) => sum + p.paid, 0),
          ).toBe(total);
        }
      }),
    );
  });
  it("shows payer and owed remainders before saving an incomplete draft", () => {
    const preview = previewDraft("a", null, {
      amount: "10",
      description: "",
      category: "Food",
      date: "2026-10-29",
      notes: "",
      splitType: "EXACT",
      payerId: "a",
      multiplePayers: true,
      people: [{ userId: "a", selected: true, paid: "8", value: "7" }],
    });
    expect(preview.remainders).toEqual({ paid: 200, owed: 300 });
    expect(preview.input).toBeNull();
  });
});

describe("changing expense participants", () => {
  const draft: ExpenseDraftInput = {
    amount: "120.01",
    description: "Dinner",
    date: "2026-11-07",
    category: "Food",
    notes: "Keep this note",
    splitType: "EXACT" as const,
    payerId: "old-friend",
    multiplePayers: true,
    people: [
      { userId: "old-friend", selected: true, paid: "120.01", value: "120.01" },
    ],
  };
  it("keeps expense details and clears obsolete custom allocations and payers", () => {
    const next = changeExpensePeople(
      draft,
      "viewer",
      ["viewer", "new-friend"],
      ["viewer", "new-friend"],
    );
    expect(next).toMatchObject({
      amount: draft.amount,
      description: draft.description,
      date: draft.date,
      category: draft.category,
      notes: draft.notes,
      splitType: "EQUAL",
      payerId: "viewer",
      multiplePayers: false,
    });
    const result = buildExpenseDraft(
      "viewer",
      "new-group",
      expenseDraftSchema.parse(next),
    );
    expect(result.input.participants.map((person) => person.userId)).toEqual([
      "viewer",
      "new-friend",
    ]);
    expect(result.input.participants.map((person) => person.paid)).toEqual([
      12001, 0,
    ]);
    expect(result.shares.reduce((sum, person) => sum + person.owed, 0)).toBe(
      12001,
    );
  });
  it("returns to a personal expense without including any unselected friend", () => {
    const next = changeExpensePeople(
      draft,
      "viewer",
      ["viewer", "friend-a", "friend-b"],
      ["viewer"],
    );
    const result = buildExpenseDraft(
      "viewer",
      null,
      expenseDraftSchema.parse(next),
    );
    expect(result.input.participants).toHaveLength(1);
    expect(result.input.participants[0]).toMatchObject({
      userId: "viewer",
      paid: 12001,
    });
    expect(result.shares).toEqual([{ userId: "viewer", owed: 12001 }]);
  });
  it("allows an excluded viewer to remain the payer", () => {
    const next = changeExpensePeople(
      draft,
      "viewer",
      ["viewer", "friend-a", "friend-b"],
      ["friend-a", "friend-b"],
    );
    const result = buildExpenseDraft(
      "viewer",
      null,
      expenseDraftSchema.parse(next),
    );
    expect(result.input.participants[0]).toMatchObject({
      userId: "viewer",
      paid: 12001,
      includedInSplit: false,
    });
    expect(
      result.shares.find((person) => person.userId === "viewer")?.owed,
    ).toBe(0);
  });
  it("does not mutate the draft when a selection is prepared", () => {
    changeExpensePeople(draft, "viewer", ["viewer"], ["viewer"]);
    expect(draft.payerId).toBe("old-friend");
    expect(draft.people[0].paid).toBe("120.01");
  });
});
