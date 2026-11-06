import { describe, expect, it } from "vitest";
import { expenseListSchema } from "@/lib/validation/expense";
import { monthToDate } from "@/lib/utils/month-to-date";

describe("spending dates", () => {
  it("defaults to the first through today in the local calendar", () => {
    expect(monthToDate(new Date(2026, 10, 1, 0, 15))).toEqual({ from: "2026-11-01", to: "2026-11-01" });
    expect(monthToDate(new Date(2028, 1, 29))).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });
  it("accepts same-day ranges and rejects reversed or impossible dates", () => {
    expect(expenseListSchema.safeParse({ from: "2026-11-01", to: "2026-11-01", scope: "mine" }).success).toBe(true);
    for (const input of [{ from: "2026-11-02", to: "2026-11-01" }, { from: "2026-02-29" }, { to: "" }, { scope: "someone-else" }]) {
      expect(expenseListSchema.safeParse(input).success).toBe(false);
    }
  });
});
