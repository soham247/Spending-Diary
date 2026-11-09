import "server-only";
import { notificationPreferencesSchema } from "@/lib/validation/notifications";
import { and, eq, ne, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { friendRequests, users } from "@/lib/db/schema";
import { assertActiveViewer } from "@/lib/auth/guards";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@/lib/validation/profile";

export async function updateProfile(viewerId: string, raw: UpdateProfileInput) {
  const { completeOnboarding, ...input } = updateProfileSchema.parse(raw);
  return db.transaction(async (tx) => {
    await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, viewerId))
      .for("update");
    await assertActiveViewer(viewerId, tx);
    const [profile] = await tx
      .update(users)
      .set({
        ...input,
        ...(completeOnboarding ? { onboardedAt: new Date() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, viewerId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        discoverableByEmail: users.discoverableByEmail,
        image: users.image,
        phone: users.phone,
        upiId: users.upiId,
        defaultCurrency: users.defaultCurrency,
        onboardedAt: users.onboardedAt,
        notificationPrefs: users.notificationPrefs,
      });
    if (input.discoverableByEmail === false)
      await tx
        .update(friendRequests)
        .set({ status: "DECLINED", respondedAt: new Date() })
        .where(
          and(
            or(
              eq(friendRequests.userLowId, viewerId),
              eq(friendRequests.userHighId, viewerId),
            ),
            ne(friendRequests.requesterId, viewerId),
            eq(friendRequests.source, "EMAIL"),
            eq(friendRequests.status, "PENDING"),
          ),
        );
    return {
      ...profile!,
      notificationPrefs: notificationPreferencesSchema.parse(
        profile!.notificationPrefs ?? {},
      ),
    };
  });
}
