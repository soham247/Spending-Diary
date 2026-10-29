import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  largestRemainder,
  splitEqual,
  splitExact,
  splitPercentage,
  splitShares,
  computeLedgerEdges,
} from "@/lib/domain/splits";

// ─── largestRemainder ────────────────────────────────────────────────

describe("largestRemainder", () => {
  it("sums to the exact total", () => {
    const items = [
      { userId: "a", exact: 33.333 },
      { userId: "b", exact: 33.333 },
      { userId: "c", exact: 33.334 },
    ];
    const result = largestRemainder(items, 100);
    const sum = [...result.values()].reduce((s, v) => s + v, 0);
    expect(sum).toBe(100);
  });

  it("distributes extra paise to largest-remainder first", () => {
    // 10 / 3 = 3.333..., two get 3, one gets 4
    const items = [
      { userId: "a", exact: 3.333 },
      { userId: "b", exact: 3.333 },
      { userId: "c", exact: 3.333 },
    ];
    const result = largestRemainder(items, 10);
    const values = [...result.values()].sort((a, b) => b - a);
    expect(values[0]).toBe(4);
    expect(values[1]).toBe(3);
    expect(values[2]).toBe(3);
    expect(values[0]! + values[1]! + values[2]!).toBe(10);
  });

  it("handles a single person", () => {
    const result = largestRemainder([{ userId: "a", exact: 1000 }], 1000);
    expect(result.get("a")).toBe(1000);
  });

  it("handles total=0", () => {
    const result = largestRemainder(
      [{ userId: "a", exact: 0 }, { userId: "b", exact: 0 }],
      0,
    );
    expect(result.get("a")).toBe(0);
    expect(result.get("b")).toBe(0);
  });
});

// ─── splitEqual ──────────────────────────────────────────────────────

describe("splitEqual", () => {
  it("splits 100 among 3 → sums to 100", () => {
    const result = splitEqual(["a", "b", "c"], 100);
    const sum = [...result.values()].reduce((s, v) => s + v, 0);
    expect(sum).toBe(100);
  });

  it("splits 1 among 3 → sums to 1", () => {
    const result = splitEqual(["a", "b", "c"], 1);
    const sum = [...result.values()].reduce((s, v) => s + v, 0);
    expect(sum).toBe(1);
  });

  it("empty list returns empty map", () => {
    expect(splitEqual([], 100).size).toBe(0);
  });

  it("property: sum always equals total", () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        (userIds, total) => {
          const unique = [...new Set(userIds)];
          const result = splitEqual(unique, total);
          const sum = [...result.values()].reduce((s, v) => s + v, 0);
          return sum === total;
        },
      ),
    );
  });
});

// ─── splitExact ──────────────────────────────────────────────────────

describe("splitExact", () => {
  it("accepts a perfectly balanced set", () => {
    const result = splitExact(
      [{ userId: "a", owed: 600 }, { userId: "b", owed: 400 }],
      1000,
    );
    expect(result.get("a")).toBe(600);
    expect(result.get("b")).toBe(400);
  });

  it("rejects a mismatched total", () => {
    expect(() =>
      splitExact([{ userId: "a", owed: 600 }], 1000),
    ).toThrow(/sum to 600 but expense total is 1000/);
  });
});

// ─── splitPercentage ─────────────────────────────────────────────────

describe("splitPercentage", () => {
  it("splits 1000 at 70/30", () => {
    const result = splitPercentage(
      [{ userId: "a", percentage: 70 }, { userId: "b", percentage: 30 }],
      1000,
    );
    expect(result.get("a")).toBe(700);
    expect(result.get("b")).toBe(300);
    expect(700 + 300).toBe(1000);
  });

  it("rejects percentages not summing to 100", () => {
    expect(() =>
      splitPercentage([{ userId: "a", percentage: 50 }], 1000),
    ).toThrow(/percentages sum to 50/i);
  });

  it("property: sum always equals total", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        (n, total) => {
          // Generate n percentages summing to 100
          const parts: number[] = [];
          let remaining = 100;
          for (let i = 0; i < n - 1; i++) {
            const share = Math.floor(remaining / (n - i));
            parts.push(share);
            remaining -= share;
          }
          parts.push(remaining);
          const participants = parts.map((pct, i) => ({
            userId: `u${i}`,
            percentage: pct,
          }));
          const result = splitPercentage(participants, total);
          const sum = [...result.values()].reduce((s, v) => s + v, 0);
          return sum === total;
        },
      ),
    );
  });
});

// ─── splitShares ─────────────────────────────────────────────────────

describe("splitShares", () => {
  it("splits 1000 in 1:1:2 ratio", () => {
    const result = splitShares(
      [
        { userId: "a", shares: 1 },
        { userId: "b", shares: 1 },
        { userId: "c", shares: 2 },
      ],
      1000,
    );
    const sum = [...result.values()].reduce((s, v) => s + v, 0);
    expect(sum).toBe(1000);
    expect(result.get("c")).toBeGreaterThan(result.get("a")!);
  });

  it("throws on zero total shares", () => {
    expect(() =>
      splitShares([{ userId: "a", shares: 0 }], 100),
    ).toThrow(/greater than zero/i);
  });

  it("property: sum always equals total", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 1, maxLength: 8 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        (sharesList, total) => {
          const participants = sharesList.map((shares, i) => ({
            userId: `u${i}`,
            shares,
          }));
          const result = splitShares(participants, total);
          const sum = [...result.values()].reduce((s, v) => s + v, 0);
          return sum === total;
        },
      ),
    );
  });
});

// ─── computeLedgerEdges ──────────────────────────────────────────────

describe("computeLedgerEdges", () => {
  it("simple A pays for A+B equally", () => {
    const edges = computeLedgerEdges([
      { userId: "A", paid: 1000, owed: 500 },
      { userId: "B", paid: 0, owed: 500 },
    ]);
    expect(edges).toHaveLength(1);
    expect(edges[0]!.debtorId).toBe("B");
    expect(edges[0]!.creditorId).toBe("A");
    expect(edges[0]!.amount).toBe(500);
  });

  it("produces no edge for a fully personal expense", () => {
    const edges = computeLedgerEdges([
      { userId: "A", paid: 1000, owed: 1000 },
    ]);
    expect(edges).toHaveLength(0);
  });

  it("three people, one payer", () => {
    const edges = computeLedgerEdges([
      { userId: "A", paid: 900, owed: 300 },
      { userId: "B", paid: 0, owed: 300 },
      { userId: "C", paid: 0, owed: 300 },
    ]);
    expect(edges).toHaveLength(2);
    const debtors = edges.map((e) => e.debtorId).sort();
    expect(debtors).toEqual(["B", "C"]);
    const totalAmount = edges.reduce((s, e) => s + e.amount, 0);
    expect(totalAmount).toBe(600);
  });

  it("property: total edge amount equals total debt owed by debtors", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            userId: fc.uuid(),
            paid: fc.integer({ min: 0, max: 10000 }),
            owed: fc.integer({ min: 0, max: 10000 }),
          }),
          { minLength: 2, maxLength: 6 },
        ),
        (participants) => {
          // Unique userIds required
          const ids = new Set(participants.map((p) => p.userId));
          if (ids.size !== participants.length) return true; // skip

          const totalPaid = participants.reduce((s, p) => s + p.paid, 0);
          const totalOwed = participants.reduce((s, p) => s + p.owed, 0);
          // In the real domain, SUM(paid) === SUM(owed) is enforced by Zod + trigger.
          // Skip inputs that violate this invariant.
          if (totalPaid !== totalOwed) return true;

          const totalDebt = participants
            .filter((p) => p.owed > p.paid)
            .reduce((s, p) => s + (p.owed - p.paid), 0);

          const edges = computeLedgerEdges(participants);
          const totalEdges = edges.reduce((s, e) => s + e.amount, 0);

          if (totalDebt === 0) return totalEdges === 0;

          // Allow ±(n-1) paise rounding tolerance
          return Math.abs(totalEdges - totalDebt) <= participants.length;
        },
      ),
    );
  });
});


describe("ledger conservation regressions", () => {
  it("keeps every creditor exact for a multi-payer expense", () => {
    const p = [{userId:"a",paid:7,owed:0},{userId:"b",paid:3,owed:0},{userId:"c",paid:0,owed:5},{userId:"d",paid:0,owed:5}];
    const edges=computeLedgerEdges(p);
    for(const person of p) expect(edges.filter(e=>e.creditorId===person.userId).reduce((s,e)=>s+e.amount,0)-edges.filter(e=>e.debtorId===person.userId).reduce((s,e)=>s+e.amount,0)).toBe(person.paid-person.owed);
  });
  it("property: balanced allocations preserve every person's net exactly", () => {
    fc.assert(fc.property(fc.array(fc.integer({min:0,max:100000}),{minLength:2,maxLength:12}), paid => {
      const total=paid.reduce((s,v)=>s+v,0);
      const owed=splitEqual(paid.map((_,i)=>String(i)),total);
      const p=paid.map((amount,i)=>({userId:String(i),paid:amount,owed:owed.get(String(i))!}));
      const edges=computeLedgerEdges(p);
      for(const person of p) {
        expect(edges.filter(e=>e.creditorId===person.userId).reduce((s,e)=>s+e.amount,0)-edges.filter(e=>e.debtorId===person.userId).reduce((s,e)=>s+e.amount,0)).toBe(person.paid-person.owed);
      }
      expect(edges.every(e=>e.amount>0&&Number.isInteger(e.amount)&&e.debtorId!==e.creditorId)).toBe(true);
    }));
  });
  it("keeps largest-remainder splits exact at the PostgreSQL integer maximum", () => {
    const values=splitShares([{userId:"a",shares:999999},{userId:"b",shares:333333},{userId:"c",shares:1}],2147483647);
    expect([...values.values()].reduce((s,v)=>s+v,0)).toBe(2147483647);
    expect([...values.values()].every(Number.isInteger)).toBe(true);
  });
});
