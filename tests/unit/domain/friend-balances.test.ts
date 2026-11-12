import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { friendBalances } from "@/lib/domain/friend-balances";

describe("friend balances", () => {
  it("nets scopes separately per currency and retains offset balances as zero", () => {
    expect(
      friendBalances([
        { currency: "INR", net: 12050 },
        { currency: "INR", net: -12050 },
        { currency: "USD", net: -500 },
        { currency: "USD", net: 200 },
      ]),
    ).toEqual([
      { currency: "INR", net: 0 },
      { currency: "USD", net: -300 },
    ]);
    expect(friendBalances([])).toEqual([]);
  });

  it("avoids precision loss in intermediate totals and rejects unsafe results", () => {
    const large = Number.MAX_SAFE_INTEGER;
    expect(
      friendBalances([
        { currency: "INR", net: large },
        { currency: "INR", net: 2 },
        { currency: "INR", net: -large },
      ]),
    ).toEqual([{ currency: "INR", net: 2 }]);
    expect(() =>
      friendBalances([
        { currency: "INR", net: large },
        { currency: "INR", net: 1 },
      ]),
    ).toThrow();
  });

  it("preserves every currency's exact signed total regardless of scope order", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            currency: fc.constantFrom("INR", "USD", "EUR"),
            net: fc.integer({ min: -1000000, max: 1000000 }),
          }),
        ),
        (balances) => {
          const result = friendBalances(balances);
          expect(result).toEqual(friendBalances([...balances].reverse()));
          for (const total of result) {
            expect(BigInt(total.net)).toBe(
              balances
                .filter((balance) => balance.currency === total.currency)
                .reduce((sum, balance) => sum + BigInt(balance.net), BigInt(0)),
            );
          }
        },
      ),
    );
  });
});
