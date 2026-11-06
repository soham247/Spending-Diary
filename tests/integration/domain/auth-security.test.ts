import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { createAuth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { accounts, rateLimits, sessions, users, verifications } from "@/lib/db/schema";
import { setTestMailbox } from "@/lib/mail/transport";

const base = "http://localhost:3000";
let mailbox: Array<{ to: string; subject: string; html: string }>;
let ipCounter = 0;
const freshPassword = () => randomBytes(24).toString("base64url");
function configuredAuth() { return createAuth({ baseURL: base, logger: { disabled: true } }); }
async function post(auth: ReturnType<typeof createAuth>, path: string, body: unknown, ip = "198.51.100." + (++ipCounter % 250 + 1)) {
  return auth.handler(new Request(base + "/api/auth/" + path, { method: "POST", headers: { "Content-Type": "application/json", Origin: base, "x-forwarded-for": ip }, body: JSON.stringify(body) }));
}
async function signup(auth: ReturnType<typeof createAuth>, email: string, password: string) {
  const response = await post(auth, "sign-up/email", { email, password, name: "Auth security fixture" });
  expect(response.status).toBe(200);
  const body = await response.json();
  return body.user.id as string;
}
function mailUrl() {
  const href = mailbox.at(-1)?.html.match(/href="([^"]+)"/)?.[1];
  if (!href) throw new Error("Expected an in-memory auth email");
  return new URL(href);
}
beforeEach(() => { mailbox = []; setTestMailbox(mailbox); });
afterEach(() => { setTestMailbox(null); });
describe("Better Auth security", () => {
  it("signs up, requires verification, then signs in with a real verified mailbox proof", async () => {
    const auth = configuredAuth(); const password = freshPassword(); const email = "verified@example.test";
    const id = await signup(auth, email, password);
    expect((await post(auth, "sign-in/email", { email, password })).status).toBe(403);
    const verification = mailUrl();
    const response = await auth.handler(new Request(verification));
    expect(response.status < 400).toBe(true);
    const [user] = await db.select().from(users).where(eq(users.id, id));
    expect(user?.emailVerified).toBe(true);
    expect((await post(auth, "sign-in/email", { email, password })).status).toBe(200);
  });
  it("rejects placeholder signup, sign-in and reset issuance without email", async () => {
    const auth = configuredAuth(); const email = "placeholder@spendingdiary.invalid"; const password = freshPassword();
    expect((await post(auth, "sign-up/email", { email, password, name: "Placeholder" })).status).toBe(400);
    expect((await post(auth, "sign-in/email", { email, password })).status).toBe(401);
    expect((await post(auth, "request-password-reset", { email })).status).toBe(200);
    expect(mailbox).toHaveLength(0); expect(await db.select().from(verifications)).toHaveLength(0);
  });
  it("revokes old sessions on password reset and consumes the proof once", async () => {
    const auth = configuredAuth(); const email = "reset@example.test"; const password = freshPassword(); const nextPassword = freshPassword();
    const id = await signup(auth, email, password);
    await db.update(users).set({ emailVerified: true }).where(eq(users.id, id));
    const signedIn = await post(auth, "sign-in/email", { email, password });
    expect(signedIn.status).toBe(200);
    expect((await post(auth, "request-password-reset", { email, redirectTo: base + "/reset-password" })).status).toBe(200);
    const token = mailUrl().pathname.split("/").at(-1)!;
    expect((await post(auth, "reset-password", { token, newPassword: nextPassword })).status).toBe(200);
    expect(await db.select().from(sessions).where(eq(sessions.userId, id))).toHaveLength(0);
    expect((await post(auth, "reset-password", { token, newPassword: password })).status).toBe(400);
    expect((await post(auth, "sign-in/email", { email, password })).status).toBe(401);
    expect((await post(auth, "sign-in/email", { email, password: nextPassword })).status).toBe(200);
  });
  it("denies reset tokens issued before an account becomes inactive", async () => {
    const auth = configuredAuth(); const email = "inactive@example.test"; const password = freshPassword();
    const id = await signup(auth, email, password);
    await db.update(users).set({ emailVerified: true }).where(eq(users.id, id));
    await post(auth, "request-password-reset", { email, redirectTo: base + "/reset-password" });
    const token = mailUrl().pathname.split("/").at(-1)!;
    await db.update(users).set({ status: "DELETED", deletedAt: new Date() }).where(eq(users.id, id));
    expect((await post(auth, "reset-password", { token, newPassword: freshPassword() })).status).toBe(400);
    expect((await post(auth, "sign-in/email", { email, password })).status).toBe(403);
  });
  it("removes an unproven password when a verified Google identity claims the same mailbox", async () => {
    const email = "owner@example.test"; const attackerPassword = freshPassword();
    const auth = createAuth({ baseURL: base, logger: { disabled: true }, socialProviders: {
      google: { clientId: "test-google-client", clientSecret: "test-google-secret", requireEmailVerification: true,
        verifyIdToken: async () => true,
        getUserInfo: async () => ({ user: { name: "Verified owner", email, emailVerified: true }, data: { sub: "google-fixture-owner", email, email_verified: true, aud: "test-google-client", azp: "test-google-client", exp: Math.floor(Date.now()/1000)+3600, iat: Math.floor(Date.now()/1000), iss: "https://accounts.google.com", family_name: "Owner", given_name: "Verified", name: "Verified owner", picture: "" } }),
      },
    } });
    const id = await signup(auth, email, attackerPassword);
    const response = await post(auth, "sign-in/social", { provider: "google", idToken: { token: "mock-provider-proof" } });
    expect(response.status).toBe(200);
    const [user] = await db.select().from(users).where(eq(users.id, id));
    expect(user?.emailVerified).toBe(true);
    expect(await db.select().from(accounts).where(and(eq(accounts.userId, id), eq(accounts.providerId, "credential")))).toHaveLength(0);
    expect((await post(auth, "sign-in/email", { email, password: attackerPassword })).status).toBe(401);
  });
  it("persists rate limits across auth instances", async () => {
    const auth = configuredAuth(); const ip = "203.0.113.77";
    const body = { email: "missing@example.test", password: freshPassword() };
    const first = await post(auth, "sign-in/email", body, ip);
    expect(first.status).toBe(401);
    expect(await db.select().from(rateLimits)).not.toHaveLength(0);
    const secondAuth = configuredAuth();
    await post(secondAuth, "sign-in/email", body, ip); await post(auth, "sign-in/email", body, ip);
    expect((await post(secondAuth, "sign-in/email", body, ip)).status).toBe(429);
  });
  it("does not issue a session for an unverified Google email", async () => {
    const email = "unverified-provider@example.test";
    const auth = createAuth({ baseURL: base, logger: { disabled: true }, socialProviders: {
      google: { clientId: "test-google-client", clientSecret: "test-google-secret", requireEmailVerification: true,
        verifyIdToken: async () => true,
        getUserInfo: async () => ({ user: { name: "Unverified", email, emailVerified: false }, data: { sub: "unverified-google", email, email_verified: false, aud: "test-google-client", azp: "test-google-client", exp: Math.floor(Date.now()/1000)+3600, iat: Math.floor(Date.now()/1000), iss: "https://accounts.google.com", family_name: "User", given_name: "Unverified", name: "Unverified User", picture: "" } }),
      },
    } });
    const response = await post(auth, "sign-in/social", { provider: "google", idToken: { token: "mock-unverified-provider-proof" } });
    expect(response.status).toBe(403);
    expect(await db.select().from(sessions)).toHaveLength(0);
  });

});
