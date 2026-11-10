import { describe, expect, it } from "vitest";
import { Redis } from "@upstash/redis";
import {
  consumeLimit,
  enforceLimit,
  reserveEmail,
} from "@/lib/rate-limit/consume";
import { consumeScript } from "@/lib/rate-limit/scripts";
import { rateLimitKey } from "@/lib/rate-limit/keys";
import { preflightEmail, maySendEmail } from "@/lib/rate-limit/email";
import { runWithRequestState } from "@better-auth/core/context";

const client = () =>
  new Redis({
    url: "http://127.0.0.1:58080",
    token: "local-test-token",
    retry: false,
    enableAutoPipelining: false,
  });
const policy = { name: "test", window: 1, max: 3, refresh: false };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Redis atomic rate limits", () => {
  it("admits exactly the limit across independent clients and recovers after expiry", async () => {
    const key = rateLimitKey("race", "viewer");
    const clients = [client(), client()];
    const results = await Promise.all(
      Array.from({ length: 40 }, (_, i) =>
        clients[i % 2].eval<number[], number[]>(
          consumeScript,
          [key],
          [1000, 5, 0],
        ),
      ),
    );
    expect(results.filter((r) => r[0] === 1)).toHaveLength(5);
    await wait(1100);
    expect(
      (
        await clients[0].eval<number[], number[]>(
          consumeScript,
          [key],
          [1000, 5, 0],
        )
      )[0],
    ).toBe(1);
  });
  it("keeps people expiry fixed and refreshes only allowed auth requests", async () => {
    await consumeLimit("viewer", policy);
    await consumeLimit("viewer", {
      ...policy,
      name: "auth-test",
      refresh: true,
    });
    await wait(550);
    const fixed = await consumeLimit("viewer", policy);
    const refreshed = await consumeLimit("viewer", {
      ...policy,
      name: "auth-test",
      refresh: true,
    });
    expect(fixed.allowed && refreshed.allowed).toBe(true);
    await wait(550);
    expect((await consumeLimit("viewer", policy)).remaining).toBe(2);
    expect(
      (
        await consumeLimit("viewer", {
          ...policy,
          name: "auth-test",
          refresh: true,
        })
      ).remaining,
    ).toBe(0);
  });
  it("denied traffic does not extend expiry and policies and viewers are isolated", async () => {
    const single = { ...policy, max: 1 };
    await enforceLimit("one", single);
    await wait(550);
    await expect(enforceLimit("one", single)).rejects.toMatchObject({
      statusCode: 429,
      retryAfter: 1,
    });
    expect((await consumeLimit("two", single)).allowed).toBe(true);
    expect(
      (await consumeLimit("one", { ...single, name: "other" })).allowed,
    ).toBe(true);
    await wait(550);
    expect((await consumeLimit("one", single)).allowed).toBe(true);
  });
  it("rejects corrupted persistent counters instead of resetting protection", async () => {
    await client().set(rateLimitKey("test:1:3:fixed", "viewer"), 1);
    await expect(consumeLimit("viewer", policy)).rejects.toMatchObject({
      statusCode: 503,
    });
  });
  it("reserves one email under concurrency and shares the hourly cap across purposes", async () => {
    const email = "same@example.test";
    const results = await Promise.all(
      Array.from({ length: 15 }, () => reserveEmail(email, "verification")),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await reserveEmail(" SAME@example.test ", "verification")).toBe(
      false,
    );
    expect(await reserveEmail(email, "password-reset")).toBe(true);
    await client().set(
      rateLimitKey("email:all:3600:5", "capped@example.test"),
      5,
      { ex: 3600 },
    );
    expect(await reserveEmail("capped@example.test", "verification")).toBe(
      false,
    );
    expect(await reserveEmail("capped@example.test", "password-reset")).toBe(
      false,
    );
    expect(
      await client().exists(
        rateLimitKey("email:verification:60:1", "capped@example.test"),
      ),
    ).toBe(0);
  });
  it("carries preflight allowance through request scope exactly once", async () => {
    await runWithRequestState(new WeakMap(), async () => {
      await preflightEmail("reserved@example.test", "password-reset");
      expect(
        await maySendEmail("reserved@example.test", "password-reset"),
      ).toBe(true);
      expect(
        await maySendEmail("reserved@example.test", "password-reset"),
      ).toBe(false);
    });
    expect(await reserveEmail("reserved@example.test", "password-reset")).toBe(
      false,
    );
  });
});
