import "server-only";
import { createHash } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import type { DbTx } from "@/lib/db/client";
import { idempotencyRecords } from "@/lib/db/schema";
import { ConflictError, ValidationError } from "@/lib/utils/errors";

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
  }
  return value;
}

export async function reserveIdempotency(tx: DbTx, viewerId: string, operation: "expense" | "settlement", key: string, input: unknown) {
  if (!key.trim() || key.length > 200) throw new ValidationError("Idempotency-Key must contain 1 to 200 characters");
  const requestHash = createHash("sha256").update(JSON.stringify(canonical(input))).digest("hex");
  const resourceId = createId();
  const [inserted] = await tx.insert(idempotencyRecords).values({ viewerId, operation, key, requestHash, resourceId }).onConflictDoNothing().returning();
  if (inserted) return { id: resourceId, replayed: false };
  const [existing] = await tx.select().from(idempotencyRecords).where(and(eq(idempotencyRecords.viewerId, viewerId), eq(idempotencyRecords.operation, operation), eq(idempotencyRecords.key, key)));
  if (!existing || existing.requestHash !== requestHash) throw new ConflictError("Idempotency-Key was already used with a different request");
  return { id: existing.resourceId, replayed: true };
}
