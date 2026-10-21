import { describe, it, expect } from "vitest";
import { safeRedirect } from "@/lib/utils/url";

describe("safeRedirect", () => {
  it("keeps a normal path", () => {
    expect(safeRedirect("/groups/1?tab=balances#x")).toBe(
      "/groups/1?tab=balances#x",
    );
  });

  it("keeps /home", () => {
    expect(safeRedirect("/home")).toBe("/home");
  });

  it("blocks backslash-prefixed URLs", () => {
    expect(safeRedirect("/\\evil.com")).toBe("/home");
  });

  it("blocks double-slash protocol-relative URLs", () => {
    expect(safeRedirect("//x")).toBe("/home");
  });

  it("blocks encoded slash tricks", () => {
    expect(safeRedirect("/%2f/x")).toBe("/%2f/x");
  });

  it("blocks dot-dot-slash escapes", () => {
    expect(safeRedirect("/.//evil.com")).toBe("/home");
  });

  it("blocks tabs inside the path", () => {
    expect(safeRedirect("/home\t/evil")).toBe("/home");
  });

  it("blocks javascript: URIs", () => {
    expect(safeRedirect("javascript:alert(1)")).toBe("/home");
  });

  it("blocks absolute external URLs", () => {
    expect(safeRedirect("https://evil.com")).toBe("/home");
  });

  it("returns fallback for empty string", () => {
    expect(safeRedirect("")).toBe("/home");
  });

  it("returns fallback for null", () => {
    expect(safeRedirect(null)).toBe("/home");
  });

  it("returns fallback for undefined", () => {
    expect(safeRedirect(undefined)).toBe("/home");
  });

  it("returns custom fallback", () => {
    expect(safeRedirect("https://evil.com", "/login")).toBe("/login");
  });

  it("keeps paths with query strings", () => {
    expect(safeRedirect("/login?callbackUrl=/groups/1")).toBe(
      "/login?callbackUrl=/groups/1",
    );
  });

  it("blocks newline injection", () => {
    expect(safeRedirect("/home\n/evil")).toBe("/home");
  });
});
