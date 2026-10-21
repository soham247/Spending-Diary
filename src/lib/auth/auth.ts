import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { isPlaceholderEmail } from "@/lib/utils/email";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/mail/transport";

const appUrl = getAppUrl();

function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

function sendInBackground(promise: Promise<unknown>): void {
  // In Next.js, use waitUntil if available; otherwise fire-and-forget
  promise.catch((err) => {
    console.error("[mail] Background send failed:", err.message);
  });
}

const isPreview =
  process.env.VERCEL_ENV === "preview" ||
  (!process.env.GOOGLE_CLIENT_ID && process.env.NODE_ENV !== "test");

export type BetterAuthOptions = Parameters<typeof betterAuth>[0];

export function createAuth(overrides: Partial<BetterAuthOptions> = {}) {
  const socialProviders =
    isPreview || !process.env.GOOGLE_CLIENT_ID
      ? {}
      : {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          },
        };

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
        rateLimit: schema.rateLimits,
      },
    }),
    baseURL: appUrl,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [appUrl],
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google"],
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        if (isPlaceholderEmail(user.email)) return;
        sendInBackground(sendVerificationEmail({ to: user.email, url }));
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 3600,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        if (isPlaceholderEmail(user.email)) return;
        sendInBackground(sendPasswordResetEmail({ to: user.email, url }));
      },
    },
    socialProviders,
    rateLimit: {
      enabled: true,
      window: 60,
      max: 30,
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ["x-forwarded-for"],
      },
    },
    user: {
      additionalFields: {
        status: {
          type: "string",
          input: false,
          defaultValue: "ACTIVE",
        },
        phone: {
          type: "string",
          required: false,
          input: false,
        },
        upiId: {
          type: "string",
          required: false,
          input: false,
          fieldName: "upi_id",
        },
        defaultCurrency: {
          type: "string",
          input: true,
          defaultValue: "INR",
          fieldName: "default_currency",
        },
        mergedIntoId: {
          type: "string",
          required: false,
          input: false,
          fieldName: "merged_into_id",
        },
        deletedAt: {
          type: "date",
          required: false,
          input: false,
          fieldName: "deleted_at",
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (isPlaceholderEmail(user.email)) {
              throw new Error("Sign-up with a placeholder email is not allowed");
            }
            return { data: { ...user, email: user.email.toLowerCase().trim() } };
          },
        },
      },
      account: {
        create: {
          before: async (account) => {
            if (account.providerId === "google") {
              // Pre-hijack defense: if the target user has an unverified
              // credential account, purge it so the attacker's password
              // doesn't survive.
              try {
                const { eq, and } = await import("drizzle-orm");
                const targetUser = await db.query.users.findFirst({
                  where: eq(schema.users.id, account.userId),
                });
                if (targetUser && !targetUser.emailVerified) {
                  // Delete credential accounts, sessions, and verifications
                  await db
                    .delete(schema.accounts)
                    .where(
                      and(
                        eq(schema.accounts.userId, account.userId),
                        eq(schema.accounts.providerId, "credential"),
                      ),
                    );
                  await db
                    .delete(schema.sessions)
                    .where(eq(schema.sessions.userId, account.userId));
                  await db
                    .delete(schema.verifications)
                    .where(
                      eq(schema.verifications.identifier, targetUser.email),
                    );
                  // Reset user fields to prevent attacker-planted data
                  const localPart = targetUser.email.split("@")[0] ?? "User";
                  await db
                    .update(schema.users)
                    .set({
                      name: localPart,
                      image: null,
                      emailVerified: true,
                    })
                    .where(eq(schema.users.id, account.userId));
                }
              } catch (err) {
                console.error("[auth] Pre-hijack cleanup failed:", err);
              }
            }
            return { data: account };
          },
        },
      },
    },
    ...overrides,
  });
}

export const auth = createAuth();
