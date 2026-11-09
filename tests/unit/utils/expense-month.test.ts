import { describe, expect, it } from "vitest";
import { nextMonthStart } from "@/lib/utils/expense-month";
import { expenseListSchema } from "@/lib/validation/expense";

describe("expense history months", () => {
  it("uses exclusive month boundaries across February and year changes", () => {
    expect(nextMonthStart("2024-02")).toBe("2024-03-01");
    expect(nextMonthStart("2026-12")).toBe("2027-01-01");
    expect(nextMonthStart("2026-09")).toBe("2026-10-01");
  });
  it("accepts history selections and rejects invalid months", () => {
    for (const month of ["latest", "all", "2026-02"])
      expect(
        expenseListSchema.safeParse({ history: "true", month }).success,
      ).toBe(true);
    for (const month of ["0000-01", "2026-00", "2026-13", "2026-2", "invalid"])
      expect(
        expenseListSchema.safeParse({ history: "true", month }).success,
      ).toBe(false);
  });
});
