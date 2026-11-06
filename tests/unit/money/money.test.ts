import { describe, it, expect } from "vitest";
import { toMinor } from "@/lib/money/to-minor";
import { formatMoney } from "@/lib/money/format-money";

describe("toMinor", () => {
  it("converts 120.50 to 12050", () => {
    expect(toMinor("120.50")).toBe(12050);
  });

  it("converts 1 to 100", () => {
    expect(toMinor("1")).toBe(100);
  });

  it("converts 0.01 to 1", () => {
    expect(toMinor("0.01")).toBe(1);
  });

  it("converts 0 to 0", () => {
    expect(toMinor("0")).toBe(0);
  });

  it("trims whitespace", () => {
    expect(toMinor(" 50 ")).toBe(5000);
  });

  it("throws on empty string", () => {
    expect(() => toMinor("")).toThrow("Amount is required");
  });

  it("throws on negative", () => {
    expect(() => toMinor("-10")).toThrow("must not be negative");
  });

  it("throws on more than 2 decimals", () => {
    expect(() => toMinor("1.234")).toThrow("Invalid amount format");
  });

  it("throws on letters", () => {
    expect(() => toMinor("abc")).toThrow("Invalid amount format");
  });

  it("converts 999999999.99", () => {
    expect(toMinor("999999999.99")).toBe(99999999999);
  });
});

describe("formatMoney", () => {
  it("formats 12050 as ₹120.50", () => {
    const result = formatMoney(12050);
    expect(result).toContain("120.50");
  });

  it("formats 0 as ₹0.00", () => {
    const result = formatMoney(0);
    expect(result).toContain("0.00");
  });

  it("formats bigint", () => {
    const result = formatMoney(BigInt(12050));
    expect(result).toContain("120.50");
  });

  it("formats negative amounts", () => {
    const result = formatMoney(-5000);
    expect(result).toContain("50.00");
  });
});
