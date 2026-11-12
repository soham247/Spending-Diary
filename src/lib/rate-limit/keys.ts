import "server-only";
import { createHmac } from "node:crypto";

export function rateLimitKey(policy: string, identifier: string): string {
  const namespace = process.env.RATE_LIMIT_NAMESPACE;
  const secret = process.env.RATE_LIMIT_KEY_SECRET;
  if (
    !namespace ||
    !/^[a-zA-Z0-9:_-]{1,80}$/.test(namespace) ||
    !secret ||
    secret.length < 32
  )
    throw new Error("Rate limit configuration is missing or invalid");
  const digest = createHmac("sha256", secret)
    .update(policy + "\0" + identifier)
    .digest("hex");
  return `${namespace}:rl:v1:${policy}:${digest}`;
}
