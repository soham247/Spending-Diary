import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema";
import { assertActiveViewer } from "@/lib/auth/guards";
import { subscriptionSchema } from "@/lib/validation/notifications";
import { NotFoundError } from "@/lib/utils/errors";
export async function saveSubscription(viewerId: string, raw: unknown) {
  const input = subscriptionSchema.parse(raw);
  await db.transaction(async (tx) => {
    await assertActiveViewer(viewerId, tx);
    const [existing] = await tx
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, input.endpoint))
      .for("update");
    if (existing && existing.userId !== viewerId) throw new NotFoundError();
    const [saved] = await tx
      .insert(pushSubscriptions)
      .values({
        userId: viewerId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { p256dh: input.keys.p256dh, auth: input.keys.auth },
        setWhere: eq(pushSubscriptions.userId, viewerId),
      })
      .returning({ id: pushSubscriptions.id });
    if (!saved) throw new NotFoundError();
  });
}
export async function removeSubscription(viewerId: string, endpoint: string) {
  await db.transaction(async (tx) => {
    await assertActiveViewer(viewerId, tx);
    await tx
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, viewerId),
          eq(pushSubscriptions.endpoint, endpoint),
        ),
      );
  });
}
