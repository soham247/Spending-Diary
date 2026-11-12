import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { auth, createAuth } from "@/lib/auth/auth";
import { setTestMailbox, sendPasswordResetEmail } from "@/lib/mail/transport";
import { db } from "@/lib/db/client";
import { users, expenses, friendRequests } from "@/lib/db/schema";
import { POST as createExpense } from "@/app/api/expenses/route";
import { POST as search } from "@/app/api/people/search/route";
import { POST as sendRequest } from "@/app/api/friends/requests/route";

const base = "http://localhost:3000";
const { sendMail } = vi.hoisted(() => ({
  sendMail: vi.fn().mockRejectedValue(new Error("ambiguous SMTP failure")),
}));
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail }) },
}));
vi.mock("@/lib/push/schedule", () => ({ schedulePush: vi.fn() }));
let mailbox: Array<{ to: string; subject: string; html: string; text: string }>;
const post = (
  instance: ReturnType<typeof createAuth>,
  path: string,
  body: unknown,
) =>
  instance.handler(
    new Request(base + "/api/auth/" + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: base },
      body: JSON.stringify(body),
    }),
  );
beforeEach(() => {
  mailbox = [];
  setTestMailbox(mailbox);
});
afterEach(() => {
  setTestMailbox(null);
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

it("retains email allowance after an ambiguous SMTP failure", async () => {
  setTestMailbox(null);
  const opts = {
    to: "smtp-failure@example.test",
    url: base + "/reset-password?token=fixture",
  };
  await sendPasswordResetEmail(opts);
  await sendPasswordResetEmail(opts);
  expect(sendMail).toHaveBeenCalledTimes(1);
});

it("keeps existing-session money writes working while protected people actions fail closed", async () => {
  const email = "outage@example.test";
  const password = randomBytes(24).toString("hex");
  const signup = await post(auth, "sign-up/email", {
    email,
    password,
    name: "Outage fixture",
  });
  expect(signup.status).toBe(200);
  const id: string = (await signup.json()).user.id;
  await db.update(users).set({ emailVerified: true }).where(eq(users.id, id));
  const login = await post(auth, "sign-in/email", { email, password });
  expect(login.status).toBe(200);
  const cookie = login.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  vi.stubEnv("RATE_LIMIT_KEY_SECRET", "");
  const request = (path: string, body: unknown) =>
    new Request(base + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: base,
        Cookie: cookie,
        "Idempotency-Key": randomBytes(16).toString("hex"),
      },
      body: JSON.stringify(body),
    });
  const unavailable = await search(
    request("/api/people/search", { query: "someone" }),
  );
  expect(unavailable.status).toBe(503);
  expect(await unavailable.json()).toMatchObject({
    error: { code: "RATE_LIMIT_UNAVAILABLE" },
  });
  expect(
    (await sendRequest(request("/api/friends/requests", { userId: id })))
      .status,
  ).toBe(503);
  expect(await db.select().from(friendRequests)).toHaveLength(0);
  const created = await createExpense(
    request("/api/expenses", {
      description: "Outage expense",
      category: "Other",
      amount: 100,
      currency: "INR",
      date: "2026-11-10",
      splitType: "EQUAL",
      participants: [{ userId: id, paid: 100 }],
    }),
  );
  expect(created.status).toBe(201);
  expect(await db.select().from(expenses)).toHaveLength(1);
  expect((await post(auth, "sign-out", {})).status).toBe(503);
});

it("suppresses recipient mail with generic responses and identical outage responses for all identities", async () => {
  const instance = createAuth({
    baseURL: base,
    rateLimit: { enabled: false },
    logger: { disabled: true },
  });
  const email = "recipient@example.test";
  const password = randomBytes(24).toString("hex");
  expect(
    (
      await post(instance, "sign-up/email", {
        email,
        password,
        name: "Recipient",
      })
    ).status,
  ).toBe(200);
  expect(mailbox).toHaveLength(1);
  const resend = await post(instance, "send-verification-email", { email });
  expect(resend.status).toBe(200);
  expect(await resend.json()).toEqual({ status: true });
  expect(mailbox).toHaveLength(1);
  const firstReset = await post(instance, "request-password-reset", { email });
  expect(firstReset.status).toBe(200);
  expect(mailbox).toHaveLength(2);
  const repeated = await post(instance, "request-password-reset", { email });
  const absent = await post(instance, "request-password-reset", {
    email: "missing@example.test",
  });
  expect(await repeated.json()).toEqual(await absent.json());
  expect(mailbox).toHaveLength(2);
  vi.stubEnv("RATE_LIMIT_KEY_SECRET", "");
  for (const candidate of [
    email,
    "missing@example.test",
    "placeholder@sub.invalid",
  ]) {
    for (const path of ["request-password-reset", "send-verification-email"]) {
      const response = await post(instance, path, { email: candidate });
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({
        code: "RATE_LIMIT_UNAVAILABLE",
      });
    }
  }
  expect(mailbox).toHaveLength(2);
});
