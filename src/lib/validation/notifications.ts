import { z } from "zod";
export const notificationPreferencesSchema = z.object({
  expenseCreated: z.boolean().default(true),
  expenseUpdated: z.boolean().default(true),
  expenseDeleted: z.boolean().default(true),
  expenseRestored: z.boolean().default(true),
  settlementCreated: z.boolean().default(true),
  settlementDeleted: z.boolean().default(true),
  inviteClaimed: z.boolean().default(true),
  pushPrompted: z.boolean().default(false),
});
export type NotificationPreferences = z.infer<
  typeof notificationPreferencesSchema
>;
export const subscriptionSchema = z.strictObject({
  endpoint: z
    .url()
    .max(2048)
    .refine((value) => {
      const url = new URL(value);
      return (
        !url.hostname.includes(":") &&
        !/^[\d.]+$/.test(url.hostname) &&
        url.hostname !== "localhost" &&
        !url.hostname.endsWith(".localhost") &&
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        (!url.port || url.port === "443")
      );
    }, "Use a secure push endpoint"),
  keys: z.strictObject({
    p256dh: z.string().regex(/^[\w-]{87}=$|^[\w-]{87}$/),
    auth: z.string().regex(/^[\w-]{22}(==)?$/),
  }),
});
export const deleteSubscriptionSchema = z.strictObject({
  endpoint: z.url().max(2048),
});
export const deleteAccountSchema = z.strictObject({
  password: z.string().max(128).optional(),
});
export const notificationTypes = [
  { key: "expenseCreated", label: "Expenses added" },
  { key: "expenseUpdated", label: "Expenses edited" },
  { key: "expenseDeleted", label: "Expenses deleted" },
  { key: "expenseRestored", label: "Expenses restored" },
  { key: "settlementCreated", label: "Payments recorded" },
  { key: "settlementDeleted", label: "Payments deleted" },
  { key: "inviteClaimed", label: "Invitation claims" },
] as const;
