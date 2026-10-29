import "server-only";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { isPlaceholderEmail } from "@/lib/utils/email";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/mail/transport";

function ineligibleIdentity(user: { email: string }): boolean {
  const fields = user as Record<string, unknown>;
  return fields.status !== "ACTIVE" || !!fields.deletedAt || isPlaceholderEmail(user.email);
}

export type BetterAuthOptions = Parameters<typeof betterAuth>[0];
export function createAuth(overrides: Partial<BetterAuthOptions> = {}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_URL ? "https://" + (process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL) : "http://localhost:3000");
  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg", transaction: true, schema: {
      user: schema.users, session: schema.sessions, account: schema.accounts,
      verification: schema.verifications, rateLimit: schema.rateLimits,
    } }),
    baseURL: appUrl,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [appUrl],
    session: { expiresIn: 60 * 60 * 24 * 90, updateAge: 60 * 60 * 24 },
    account: { accountLinking: { enabled: true, trustedProviders: [], requireLocalEmailVerified: false, updateUserInfoOnLink: true } },
    emailVerification: {
      sendOnSignUp: true, autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        if (!isPlaceholderEmail(user.email)) await sendVerificationEmail({ to: user.email, url });
      },
    },
    emailAndPassword: {
      enabled: true, requireEmailVerification: true, minPasswordLength: 10, maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 3600, revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        if (!isPlaceholderEmail(user.email)) await sendPasswordResetEmail({ to: user.email, url });
      },
    },
    socialProviders: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {
      google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, requireEmailVerification: true },
    } : {},
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
    hooks: { before: createAuthMiddleware(async ctx => {
      const body = ctx.body as Record<string, unknown> | undefined;
      if (ctx.path === "/sign-in/email" && typeof body?.email === "string" && isPlaceholderEmail(body.email)) {
        throw new APIError("UNAUTHORIZED", { message: "Invalid email or password" });
      }
      if (ctx.path === "/request-password-reset" && typeof body?.email === "string") {
        const record = isPlaceholderEmail(body.email) ? null : await ctx.context.internalAdapter.findUserByEmail(body.email.trim().toLowerCase());
        if (isPlaceholderEmail(body.email) || (record && ineligibleIdentity(record.user))) {
          return ctx.json({ status: true, message: "If this email exists in our system, check your email for the reset link" });
        }
      }
      if (ctx.path === "/reset-password") {
        const token = body?.token ?? ctx.query?.token;
        if (typeof token === "string") {
          const proof = await ctx.context.internalAdapter.findVerificationValue("reset-password:" + token);
          const user = proof ? await ctx.context.internalAdapter.findUserById(proof.value) : null;
          if (user && ineligibleIdentity(user)) {
            throw new APIError("BAD_REQUEST", { message: "Invalid token" });
          }
        }
      }
    }) },
    user: { additionalFields: {
      status: { type: "string", input: false, defaultValue: "ACTIVE" },
      phone: { type: "string", required: false, input: false },
      upiId: { type: "string", required: false, input: false },
      defaultCurrency: { type: "string", input: false, defaultValue: "INR" },
      mergedIntoId: { type: "string", required: false, input: false },
      deletedAt: { type: "date", required: false, input: false },
    } },
    databaseHooks: {
      user: { create: { before: async user => {
        if (isPlaceholderEmail(user.email)) throw new APIError("BAD_REQUEST", { message: "This email address cannot register" });
        return { data: { ...user, email: user.email.trim().toLowerCase() } };
      } } },
      session: { create: { before: async (session, ctx) => {
        if (!ctx) throw new APIError("INTERNAL_SERVER_ERROR", { message: "Session context is missing" });
        const user = await ctx.context.internalAdapter.findUserById(session.userId);
        if (!user || ineligibleIdentity(user) || !user.emailVerified) {
          throw new APIError("FORBIDDEN", { message: "Account is not eligible to sign in" });
        }
      } } },
      account: { create: { before: async (account, ctx) => {
        if (account.providerId === "google") {
          if (!ctx) throw new APIError("INTERNAL_SERVER_ERROR", { message: "Account linking context is missing" });
          const adapter = ctx.context.internalAdapter;
          const user = await adapter.findUserById(account.userId);
          if (user && !user.emailVerified) {
            for (const existing of await adapter.findAccounts(user.id)) {
              if (existing.providerId === "credential") await adapter.deleteAccount(existing.id);
            }
            await adapter.deleteUserSessions(user.id);
          }
        }
        return { data: account };
      } } },
    },
    ...overrides,
  });
}
export const auth = createAuth();
