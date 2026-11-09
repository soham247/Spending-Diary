import { afterEach, describe, expect, it, vi } from "vitest";
import { requireSameOrigin } from "@/lib/api/request-origin";

afterEach(() => vi.unstubAllEnvs());
describe("request origin", () => {
  it("accepts app-origin and non-browser requests", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://diary.example.test");
    expect(() =>
      requireSameOrigin(
        new Request("http://internal/api/me", {
          headers: { Origin: "https://diary.example.test" },
        }),
      ),
    ).not.toThrow();
    expect(() =>
      requireSameOrigin(new Request("http://internal/api/me")),
    ).not.toThrow();
  });
  it.each([
    "https://evil.example.test",
    "null",
    "https://diary.example.test.evil.test",
  ])("rejects an untrusted origin %s", (origin) => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://diary.example.test");
    expect(() =>
      requireSameOrigin(
        new Request("https://diary.example.test/api/me", {
          headers: { Origin: origin },
        }),
      ),
    ).toThrow();
  });
  it("rejects cross-site browser traffic even without Origin", () => {
    expect(() =>
      requireSameOrigin(
        new Request("https://diary.example.test/api/me", {
          headers: { "Sec-Fetch-Site": "cross-site" },
        }),
      ),
    ).toThrow();
  });
});
