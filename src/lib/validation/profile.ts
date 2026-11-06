import { notificationPreferencesSchema, type NotificationPreferences } from "./notifications";
import { z } from "zod";
import { currencySchema } from "./money";

export const updateProfileSchema = z.strictObject({
  notificationPrefs: notificationPreferencesSchema.optional(),
  completeOnboarding: z.boolean().optional(),
  name: z.string().trim().min(1, "Enter your name").max(100).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  upiId: z.string().trim().max(255).regex(/^[\w.-]+@[\w.-]+$/, "Enter a UPI ID such as name@bank").nullable().optional(),
  defaultCurrency: currencySchema.optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export interface Profile { id: string; name: string; email: string; image: string | null; phone: string | null; upiId: string | null; defaultCurrency: "INR"; onboardedAt: string | null; notificationPrefs: NotificationPreferences }
