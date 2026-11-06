import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { balanceSummary } from "@/lib/domain/balance-summary";
import type { BalanceRow } from "@/lib/api/balances";

function row(scopeId: string, amount: number, currency = "INR", userHighId = "b"): BalanceRow {
  return { scopeId, amount, currency, userLowId: "a", userHighId, updatedAt: "2026-10-31T00:00:00Z" };
}

describe("home balance summary", () => {
  it("nets each person across scopes while preserving currencies and group totals", () => {
    const summary = balanceSummary("a", [row("direct", -700), row("trip", 200), row("direct", 300, "USD"), row("trip", -100, "INR", "c")]);
    expect(summary.people).toEqual([
      { userId: "b", currency: "INR", net: 500 },
      { userId: "b", currency: "USD", net: -300 },
      { userId: "c", currency: "INR", net: 100 },
    ]);
    expect(summary.groups).toEqual([{ scopeId: "trip", currency: "INR", net: -100 }]);
    expect(summary.totals).toEqual([{ currency: "INR", net: 600 }, { currency: "USD", net: -300 }]);
  });

  it("handles the other pair direction, offsetting debt and empty balances", () => {
    expect(balanceSummary("b", [row("direct", 250)]).people).toEqual([{ userId: "a", currency: "INR", net: 250 }]);
    expect(balanceSummary("a", [row("direct", 100), row("trip", -100)]).people).toEqual([{ userId: "b", currency: "INR", net: 0 }]);
    expect(balanceSummary("a", [])).toEqual({ totals: [], groups: [], people: [] });
  });

  it("preserves the viewer's total separately for every currency", () => {
    fc.assert(fc.property(fc.array(fc.record({
      scopeId: fc.constantFrom("direct", "trip"), currency: fc.constantFrom("INR", "USD"),
      amount: fc.integer({ min: -1000000, max: 1000000 }), other: fc.constantFrom("b", "c"),
    }), { maxLength: 100 }), entries => {
      const summary = balanceSummary("a", entries.map(entry => row(entry.scopeId, entry.amount, entry.currency, entry.other)));
      for (const total of summary.totals) {
        const expected = entries.filter(entry => entry.currency === total.currency).reduce((sum, entry) => sum - BigInt(entry.amount), BigInt(0));
        expect(BigInt(total.net)).toBe(expected);
        expect(summary.people.filter(person => person.currency === total.currency).reduce((sum, person) => sum + BigInt(person.net), BigInt(0))).toBe(expected);
      }
    }));
  });
});
