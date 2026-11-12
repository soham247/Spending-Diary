import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { rateLimitKey } from "@/lib/rate-limit/keys";

let server: Server | undefined;
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("RATE_LIMIT_NAMESPACE", "sd:unit");
  vi.stubEnv("RATE_LIMIT_KEY_SECRET", "a-test-key-with-at-least-32-characters");
  vi.stubEnv("KV_REST_API_TOKEN", "fixture-only");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(async () => {
  server?.closeAllConnections();
  if (server)
    await new Promise<void>((resolve) => server!.close(() => resolve()));
  server = undefined;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("rate limit HTTP failure boundary", () => {
  it.each(["quota", "credentials", "malformed", "timeout"])(
    "fails closed on %s without replaying the consuming request",
    async (mode) => {
      let calls = 0;
      server = createServer((req, res) => {
        calls++;
        req.resume();
        if (mode === "timeout") return;
        res.writeHead(
          mode === "quota" ? 429 : mode === "credentials" ? 401 : 200,
          { "Content-Type": "application/json" },
        );
        res.end(
          JSON.stringify(
            mode === "malformed"
              ? { result: [1, "invalid", 0] }
              : { error: "fixture rejection" },
          ),
        );
      });
      await new Promise<void>((resolve) =>
        server!.listen(0, "127.0.0.1", resolve),
      );
      vi.stubEnv(
        "KV_REST_API_URL",
        `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
      );
      const { enforceLimit } = await import("@/lib/rate-limit/consume");
      const start = Date.now();
      await expect(
        enforceLimit("viewer", {
          name: "test",
          max: 1,
          window: 60,
          refresh: false,
        }),
      ).rejects.toMatchObject({
        statusCode: 503,
        code: "RATE_LIMIT_UNAVAILABLE",
      });
      expect(Date.now() - start).toBeLessThan(1600);
      expect(calls).toBe(1);
    },
  );
  it("does not allow requests with missing configuration", async () => {
    vi.stubEnv("KV_REST_API_URL", "");
    const { enforceLimit } = await import("@/lib/rate-limit/consume");
    await expect(
      enforceLimit("viewer", {
        name: "test",
        max: 1,
        window: 60,
        refresh: false,
      }),
    ).rejects.toMatchObject({ statusCode: 503 });
  });
  it("pseudonymizes identifiers and separates environments and policy", () => {
    const first = rateLimitKey("email", "private@example.test");
    expect(first).not.toContain("private@example.test");
    expect(rateLimitKey("auth", "private@example.test")).not.toBe(first);
    vi.stubEnv("RATE_LIMIT_NAMESPACE", "sd:preview");
    expect(rateLimitKey("email", "private@example.test")).not.toBe(first);
  });
});
