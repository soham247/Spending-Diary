import { describe, it, expect } from "vitest";
import { isPlaceholderEmail } from "@/lib/utils/email";

describe("isPlaceholderEmail", () => {
  it("detects @x.invalid", () => {
    expect(isPlaceholderEmail("a@x.invalid")).toBe(true);
  });

  it("detects @invalid", () => {
    expect(isPlaceholderEmail("a@invalid")).toBe(true);
  });

  it("detects uppercase @SUB.INVALID.", () => {
    expect(isPlaceholderEmail("A@SUB.INVALID.")).toBe(true);
  });

  it("detects trailing spaces", () => {
    expect(isPlaceholderEmail("a@x.invalid ")).toBe(true);
  });

  it("detects spendingdiary.invalid", () => {
    expect(isPlaceholderEmail("placeholder+abc@spendingdiary.invalid")).toBe(
      true,
    );
  });

  it("passes valid addresses", () => {
    expect(isPlaceholderEmail("user@example.com")).toBe(false);
  });

  it("passes gmail addresses", () => {
    expect(isPlaceholderEmail("user@gmail.com")).toBe(false);
  });

  it("passes addresses with invalid in local part", () => {
    expect(isPlaceholderEmail("invalid@example.com")).toBe(false);
  });

  it("rejects strings without @", () => {
    expect(isPlaceholderEmail("nope")).toBe(false);
  });
});
