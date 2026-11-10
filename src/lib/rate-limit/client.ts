import "server-only";
import { Redis } from "@upstash/redis";

let redis: Redis | undefined;

export function rateLimitClient(): Redis {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Rate limit configuration is missing");
  const endpoint = new URL(url);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
  if (
    endpoint.protocol !== "https:" &&
    !(
      local &&
      endpoint.protocol === "http:" &&
      (process.env.NODE_ENV === "test" || !process.env.VERCEL)
    )
  )
    throw new Error("Redis requires HTTPS");
  redis = new Redis({
    url,
    token,
    retry: false,
    signal: () => AbortSignal.timeout(1000),
    enableAutoPipelining: false,
    enableTelemetry: false,
  });
  return redis;
}
