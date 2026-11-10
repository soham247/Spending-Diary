import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { memoryAdapter } from "better-auth/adapters/memory";
import { createAuth } from "@/lib/auth/auth";
import { RateLimitUnavailableError } from "@/lib/utils/errors";
import { setTestMailbox } from "@/lib/mail/transport";

const { consume, reserve } = vi.hoisted(() => ({
  consume: vi.fn(),
  reserve: vi.fn(),
}));
vi.mock("@/lib/rate-limit/consume", () => ({
  consumeLimit: consume,
  reserveEmail: reserve,
}));

const base = "http://localhost:3000";
const app = () =>
  createAuth({
    database: memoryAdapter({
      user: [],
      session: [],
      account: [],
      verification: [],
    }),
    baseURL: base,
    secret: "isolated-auth-test-secret-with-32-characters",
    logger: { disabled: true },
  });
const post = (
  auth: ReturnType<typeof createAuth>,
  path: string,
  email = "absent@example.test",
  headers: Record<string, string> = {},
) =>
  auth.handler(
    new Request(base + "/api/auth/" + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: base, ...headers },
      body: JSON.stringify({
        email,
        password: "test-password-32-characters-long",
        name: "Fixture",
      }),
    }),
  );

beforeEach(() => {
  vi.stubEnv("VERCEL", "");
  consume.mockResolvedValue({ allowed: true, remaining: 2, retryAfter: 10 });
  reserve.mockResolvedValue(true);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  setTestMailbox(null);
});

describe("auth HTTP rate-limit boundary", () => {
  it("returns native 429 and retry headers, preserving special rules", async () => {
    consume.mockResolvedValue({ allowed: false, remaining: 0, retryAfter: 7 });
    const response = await post(app(), "sign-in/email");
    expect(response.status).toBe(429);
    expect(response.headers.get("X-Retry-After")).toBe("7");
    expect(await response.json()).toEqual({
      message: "Too many requests. Please try again later.",
    });
    expect(consume).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ max: 3, window: 10 }),
    );
  });
  it("maps limiter failure to native 503 before signup or email execution", async () => {
    consume.mockRejectedValue(new RateLimitUnavailableError());
    const auth = app();
    for (const path of [
      "sign-in/email",
      "sign-up/email",
      "request-password-reset",
      "send-verification-email",
    ]) {
      const response = await post(auth, path);
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({
        code: "RATE_LIMIT_UNAVAILABLE",
      });
    }
    expect(reserve).not.toHaveBeenCalled();
  });
  it("maps recipient preflight failure to identical 503 for absent and placeholder identities", async () => {
    reserve.mockRejectedValue(new RateLimitUnavailableError());
    const auth = app();
    for (const path of ["request-password-reset", "send-verification-email"]) {
      for (const email of ["absent@example.test", "placeholder@sub.invalid"]) {
        const response = await post(auth, path, email);
        expect(response.status).toBe(503);
        expect(await response.json()).toMatchObject({
          code: "RATE_LIMIT_UNAVAILABLE",
        });
      }
    }
  });
  it("does not consult Redis for server-side session reads during outage", async () => {
    consume.mockRejectedValue(new RateLimitUnavailableError());
    expect(await app().api.getSession({ headers: new Headers() })).toBeNull();
    expect(consume).not.toHaveBeenCalled();
  });
  it("ignores arbitrary client IP headers outside trusted Vercel ingress", async () => {
    consume.mockResolvedValue({ allowed: false, retryAfter: 10 });
    const auth = app();
    await post(auth, "sign-in/email", undefined, {
      "x-forwarded-for": "1.2.3.4",
      "x-real-ip": "5.6.7.8",
    });
    await post(auth, "sign-in/email", undefined, {
      "x-forwarded-for": "8.8.8.8",
    });
    expect(consume.mock.calls[0][0]).toEqual(consume.mock.calls[1][0]);
  });
  it("uses the Vercel header and normalizes IPv6 subnets", async () => {
    vi.stubEnv("VERCEL", "1");
    consume.mockResolvedValue({ allowed: false, retryAfter: 10 });
    const auth = app();
    await post(auth, "sign-in/email", undefined, {
      "x-forwarded-for": "2001:db8:abcd:1234::1",
    });
    await post(auth, "sign-in/email", undefined, {
      "x-forwarded-for": "2001:db8:abcd:1234::2",
    });
    expect(consume.mock.calls[0][0]).toEqual(consume.mock.calls[1][0]);
    await post(auth, "sign-in/email", undefined, {
      "x-forwarded-for": "2001:db8:abcd:9999::1",
    });
    expect(consume.mock.calls[2][0]).not.toEqual(consume.mock.calls[0][0]);
  });
  it("preflights signup and consumes its email reservation only once", async () => {
    const mailbox: Array<{
      to: string;
      subject: string;
      html: string;
      text: string;
    }> = [];
    setTestMailbox(mailbox);
    const auth = app();
    const response = await post(auth, "sign-up/email", "new@example.test");
    expect(response.status).toBe(200);
    expect(reserve).toHaveBeenCalledTimes(1);
    expect(mailbox).toHaveLength(1);
  });
});
