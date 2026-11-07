import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { simplifyDebts } from "@/lib/domain/simplify";
describe("debt simplification", () => {
  it("preserves every member's net and is deterministic", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1000000, max: 1000000 }), {
          minLength: 1,
          maxLength: 30,
        }),
        (values) => {
          const nets = [...values, 0 - values.reduce((a, b) => a + b, 0)].map(
            (net, i) => ({ userId: "user-" + i, net }),
          );
          const edges = simplifyDebts(nets);
          expect(edges).toEqual(simplifyDebts([...nets].reverse()));
          expect(edges.length).toBeLessThanOrEqual(nets.length - 1);
          for (const row of nets)
            expect(
              edges.reduce(
                (sum, edge) =>
                  sum +
                  (edge.creditorId === row.userId ? edge.amount : 0) -
                  (edge.debtorId === row.userId ? edge.amount : 0),
                0,
              ),
            ).toBe(row.net);
        },
      ),
    );
  });
  it("creates no transfers for zero balances", () => {
    expect(
      simplifyDebts([
        { userId: "a", net: 0 },
        { userId: "b", net: 0 },
      ]),
    ).toEqual([]);
  });
  it("rejects unbalanced inputs", () => {
    expect(() => simplifyDebts([{ userId: "a", net: 1 }])).toThrow();
  });
});
