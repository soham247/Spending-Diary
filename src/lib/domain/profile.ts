import "server-only";
import { notificationPreferencesSchema } from "@/lib/validation/notifications";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { assertActiveViewer } from "@/lib/auth/guards";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@/lib/validation/profile";

export async function updateProfile(viewerId: string, raw: UpdateProfileInput) {
  const { completeOnboarding, ...input } = updateProfileSchema.parse(raw);
  return db.transaction(async (tx) => {
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
        image: users.image,
        phone: users.phone,
        upiId: users.upiId,
        defaultCurrency: users.defaultCurrency,
        onboardedAt: users.onboardedAt,
        notificationPrefs: users.notificationPrefs,
      });
    return {
      ...profile!,
      notificationPrefs: notificationPreferencesSchema.parse(
        profile!.notificationPrefs ?? {},
      ),
    };
  });
}
