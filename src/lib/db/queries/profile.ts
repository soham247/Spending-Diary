import "server-only";
import { notificationPreferencesSchema } from "@/lib/validation/notifications";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { NotFoundError } from "@/lib/utils/errors";

export async function getProfile(viewerId: string) {
  const [profile] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      phone: users.phone,
      upiId: users.upiId,
      defaultCurrency: users.defaultCurrency,
      onboardedAt: users.onboardedAt,
      notificationPrefs: users.notificationPrefs,
    })
    .from(users)
    .where(
      and(
        eq(users.id, viewerId),
        eq(users.status, "ACTIVE"),
        eq(users.emailVerified, true),
        isNull(users.deletedAt),
      ),
    );
  if (!profile) throw new NotFoundError();
  return {
    ...profile,
    notificationPrefs: notificationPreferencesSchema.parse(
      profile.notificationPrefs ?? {},
    ),
  };
}
