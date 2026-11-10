import { describe, expect, it } from "vitest";
import {
  expenseDetailSummary,
  splitWeightLabel,
} from "@/lib/domain/expense-detail";
import { expenseHistoryChanges } from "@/lib/domain/expense-history";
import type { ExpenseDetail } from "@/lib/api/expenses";

const expense: ExpenseDetail = {
  id: "bill",
  groupId: null,
  kind: "SHARED",
  description: "Dinner",
  category: "Food",
  notes: null,
  amount: 100,
  currency: "INR",
  date: "2026-11-10",
  splitType: "EQUAL",
  version: 1,
  deletedAt: null,
  createdById: "payer",
  createdAt: "2026-11-10T10:00:00Z",
  canEdit: true,
  participants: [
    {
      userId: "payer",
      name: "Payer",
      paid: 100,
      owed: 0,
      splitInput: "0",
      includedInSplit: false,
    },
    {
      userId: "a",
      name: "Aman",
      paid: 0,
      owed: 34,
      splitInput: null,
      includedInSplit: true,
    },
    {
      userId: "b",
      name: "Priya",
      paid: 0,
      owed: 33,
      splitInput: null,
      includedInSplit: true,
    },
    {
      userId: "c",
      name: "C",
      paid: 0,
      owed: 33,
      splitInput: null,
      includedInSplit: true,
    },
  ],
};
const names = new Map([
  ["a", "Aman"],
  ["b", "Priya"],
]);

describe("expense detail presentation", () => {
  it("keeps a payer-only participant out of the split and preserves saved rounded shares", () => {
    const summary = expenseDetailSummary(expense, "payer");
    expect(summary.viewer).toMatchObject({ paid: 100, owed: 0 });
    expect(summary.payers).toHaveLength(1);
    expect(summary.split.map((person) => person.owed)).toEqual([34, 33, 33]);
    expect(summary.splitLabel).toBe("Split equally between 3 people");
    expect(expenseDetailSummary(expense, "observer").viewer).toBeUndefined();
  });

  it("keeps an included participant with a rounded zero share in the split", () => {
    const summary = expenseDetailSummary(
      { ...expense, participants: [{ ...expense.participants[1]!, owed: 0 }] },
      "a",
    );
    expect(summary.split).toHaveLength(1);
    expect(summary.splitLabel).toBe("Split equally between 1 person");
  });

  it("displays saved weights without decimal conversion or recomputing money", () => {
    expect(splitWeightLabel("PERCENTAGE", "33.3300")).toBe("33.33%");
    expect(splitWeightLabel("PERCENTAGE", "100.0000")).toBe("100%");
    expect(splitWeightLabel("SHARES", "1.0000")).toBe("1 share");
    expect(splitWeightLabel("SHARES", "10")).toBe("10 shares");
    expect(splitWeightLabel("EXACT", "50")).toBeNull();
  });
});

describe("expense history snapshots", () => {
  it("compares the real stored-row before snapshot with an equal-split input after snapshot", () => {
    const before = {
      ...expense,
      participants: expense.participants.slice(1).map((person) => ({
        ...person,
        paid: person.userId === "a" ? 100 : 0,
      })),
    };
    const after = {
      ...before,
      amount: 101,
      participants: before.participants.map((person) => ({
        userId: person.userId,
        paid: person.userId === "a" ? 101 : 0,
      })),
    };
    const changes = expenseHistoryChanges(
      { description: "Dinner", before, after },
      names,
    );
    expect(changes).toContainEqual({
      kind: "money",
      label: "Bill total",
      before: 100,
      after: 101,
      currency: "INR",
    });
    expect(changes).toContainEqual({
      kind: "money",
      label: "Priya — share",
      before: 33,
      after: 34,
      currency: "INR",
    });
    expect(changes).not.toContainEqual(
      expect.objectContaining({ label: "Aman — share" }),
    );
  });

  it("handles note-only edits and removed participants without leaking user IDs", () => {
    const changes = expenseHistoryChanges(
      {
        description: "Dinner",
        before: {
          notes: "Old",
          currency: "INR",
          participants: [{ userId: "private-id", paid: 0, owed: 50 }],
        },
        after: { notes: null, currency: "INR", participants: [] },
      },
      names,
    );
    expect(changes).toContainEqual({
      kind: "text",
      label: "Notes",
      before: "Old",
      after: "None",
    });
    expect(changes).toContainEqual({
      kind: "text",
      label: "Participant",
      before: "Included",
      after: "Removed",
    });
    expect(JSON.stringify(changes)).not.toContain("private-id");
  });

  it("does not invent a split change when Postgres serializes excluded weights with decimal places", () => {
    const before = {
      ...expense,
      participants: expense.participants.map(
        ({ includedInSplit, ...person }) => ({
          ...person,
          splitInput: includedInSplit ? null : "0.0000",
        }),
      ),
    };
    const after = {
      ...expense,
      notes: "Added a note",
      participants: expense.participants.map((person) => ({
        userId: person.userId,
        paid: person.paid,
        includedInSplit: person.includedInSplit,
      })),
    };
    expect(
      expenseHistoryChanges({ description: "Dinner", before, after }, names),
    ).toEqual([
      { kind: "text", label: "Notes", before: "None", after: "Added a note" },
    ]);
  });

  it("does not invent changes for malformed, missing or unchanged snapshots", () => {
    for (const metadata of [
      null,
      { description: "Legacy" },
      { description: "Bad", before: { amount: 1.5 }, after: { amount: 2 } },
      { description: "Same", before: expense, after: expense },
    ]) {
      expect(expenseHistoryChanges(metadata, names)).toEqual([]);
    }
  });

  it("never compares money across different currencies", () => {
    expect(
      expenseHistoryChanges(
        {
          description: "Invalid",
          before: { amount: 100, currency: "INR" },
          after: { amount: 200, currency: "USD" },
        },
        names,
      ),
    ).toEqual([]);
  });

  it.each(["PERCENTAGE", "SHARES"] as const)(
    "reconstructs %s snapshots through the canonical split function",
    (splitType) => {
      const before = {
        ...expense,
        splitType,
        participants: [
          {
            userId: "a",
            paid: 100,
            owed: 50,
            splitInput: splitType === "SHARES" ? "1.0000" : "50.0000",
          },
          {
            userId: "b",
            paid: 0,
            owed: 50,
            splitInput: splitType === "SHARES" ? "1.0000" : "50.0000",
          },
        ],
      };
      const after = {
        ...before,
        participants: [
          {
            userId: "a",
            paid: 100,
            ...(splitType === "SHARES" ? { shares: 3 } : { percentage: 75 }),
          },
          {
            userId: "b",
            paid: 0,
            ...(splitType === "SHARES" ? { shares: 1 } : { percentage: 25 }),
          },
        ],
      };
      expect(
        expenseHistoryChanges({ description: "Dinner", before, after }, names),
      ).toContainEqual({
        kind: "money",
        label: "Aman — share",
        before: 50,
        after: 75,
        currency: "INR",
      });
    },
  );
});
