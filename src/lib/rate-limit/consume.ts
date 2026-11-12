import "server-only";
import { z } from "zod";
import { RateLimitError, RateLimitUnavailableError } from "@/lib/utils/errors";
import { rateLimitClient } from "./client";
import { rateLimitKey } from "./keys";
import { consumeScript, reserveEmailScript } from "./scripts";
import type { EmailPurpose, RateLimitPolicy } from "./policies";

const resultSchema = z.tuple([
  z.union([z.literal(0), z.literal(1)]),
  z.number().int().nonnegative(),
  z.number().int().nonnegative(),
]);

async function protectedCall<T extends { allowed: boolean }>(
  policy: string,
  operation: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new RateLimitUnavailableError()), 1000);
      }),
    ]);
    console.info("[rate-limit]", {
      policy,
      outcome: result.allowed ? "allowed" : "denied",
      elapsedMs: Date.now() - start,
    });
    return result;
  } catch {
    console.warn("[rate-limit]", {
      policy,
      outcome: "unavailable",
      elapsedMs: Date.now() - start,
    });
    throw new RateLimitUnavailableError();
  } finally {
    clearTimeout(timer);
  }
}

export async function consumeLimit(
  identifier: string,
  policy: RateLimitPolicy,
) {
  return protectedCall(policy.name, async () => {
    if (
      !Number.isSafeInteger(policy.window) ||
      policy.window < 1 ||
      policy.window > 3600 ||
      !Number.isSafeInteger(policy.max) ||
      policy.max < 1
    )
      throw new Error("Invalid rate limit policy");
    const key = rateLimitKey(
      `${policy.name}:${policy.window}:${policy.max}:${policy.refresh ? "refresh" : "fixed"}`,
      identifier,
    );
    const [allowed, remaining, ttl] = resultSchema.parse(
      await rateLimitClient().eval(
        consumeScript,
        [key],
        [policy.window * 1000, policy.max, policy.refresh ? 1 : 0],
      ),
    );
    if (remaining >= policy.max || ttl > policy.window * 1000)
      throw new Error("Invalid limit response");
    return {
      allowed: allowed === 1,
      remaining,
      retryAfter: Math.max(1, Math.ceil(ttl / 1000)),
    };
  });
}

export async function enforceLimit(
  identifier: string,
  policy: RateLimitPolicy,
) {
  const result = await consumeLimit(identifier, policy);
  if (!result.allowed) throw new RateLimitError(result.retryAfter);
}

export async function reserveEmail(
  email: string,
  purpose: EmailPurpose,
): Promise<boolean> {
  const decision = await protectedCall("email", async () => {
    const normalized = email.trim().toLowerCase();
    const result = await rateLimitClient().eval(
      reserveEmailScript,
      [
        rateLimitKey(`email:${purpose}:60:1`, normalized),
        rateLimitKey("email:all:3600:5", normalized),
      ],
      [],
    );
    return {
      allowed: z.union([z.literal(0), z.literal(1)]).parse(result) === 1,
    };
  });
  return decision.allowed;
}
