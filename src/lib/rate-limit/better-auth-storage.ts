import "server-only";
import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { getIP } from "better-auth/api";
import { consumeLimit } from "./consume";
import { RateLimitUnavailableError } from "@/lib/utils/errors";

export function authRateLimits() {
  const responses = new WeakMap<Request, Response>();
  const rateLimit = {
    enabled: true,
    window: 60,
    max: 30,
    customRules: {
      "/**": async (request, rule) => {
        try {
          const ip = getIP(request, {
            advanced: {
              ipAddress: {
                ipAddressHeaders: process.env.VERCEL ? ["x-forwarded-for"] : [],
              },
            },
          });
          const path = new URL(request.url).pathname.replace(/\/+$/, "");
          const result = await consumeLimit(
            `${ip ?? "no-trusted-ip"}:${path}`,
            { name: "auth", ...rule, refresh: true },
          );
          if (!result.allowed)
            responses.set(
              request,
              Response.json(
                { message: "Too many requests. Please try again later." },
                {
                  status: 429,
                  headers: {
                    "X-Retry-After": String(result.retryAfter),
                    "Retry-After": String(result.retryAfter),
                    "Cache-Control": "no-store",
                  },
                },
              ),
            );
        } catch {
          const error = new RateLimitUnavailableError();
          responses.set(
            request,
            Response.json(
              { code: error.code, message: error.message },
              { status: 503, headers: { "Cache-Control": "no-store" } },
            ),
          );
        }
        // The request plugin returns failures because storage errors escape the router's error handler.
        return false as const;
      },
    },
  } satisfies NonNullable<BetterAuthOptions["rateLimit"]>;
  const plugin = {
    id: "redis-rate-limit-response",
    onRequest: async (request) => {
      const response = responses.get(request);
      responses.delete(request);
      if (response) return { response };
    },
  } satisfies BetterAuthPlugin;
  return { rateLimit, plugin };
}
