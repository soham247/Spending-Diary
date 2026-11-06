import "server-only";
import webpush from "web-push";
import { and, eq, isNull, ne, gt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { activityRecipients, activities, users, pushSubscriptions } from "@/lib/db/schema";
import { notificationPreferencesSchema, type NotificationPreferences } from "@/lib/validation/notifications";
import { pushAgent } from "./public-agent";
const preferences: Record<string, keyof NotificationPreferences> = { EXPENSE_CREATED: "expenseCreated", EXPENSE_UPDATED: "expenseUpdated", EXPENSE_DELETED: "expenseDeleted", EXPENSE_RESTORED: "expenseRestored", SETTLEMENT_CREATED: "settlementCreated", SETTLEMENT_DELETED: "settlementDeleted", INVITE_CLAIMED: "inviteClaimed" };
export async function dispatchPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY; const privateKey = process.env.VAPID_PRIVATE_KEY; const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return { configured: false, delivered: 0 };
  let delivered = 0;
  await db.transaction(async tx => {
    const pending = await tx.select({ event: activities, recipient: activityRecipients, prefs: users.notificationPrefs }).from(activityRecipients).innerJoin(activities,eq(activities.id,activityRecipients.activityId)).innerJoin(users,eq(users.id,activityRecipients.userId)).where(and(isNull(activityRecipients.pushSentAt),ne(activities.actorId,activityRecipients.userId),eq(users.status,"ACTIVE"),gt(activities.createdAt,new Date(Date.now()-86400000)))).limit(10).for("update",{ of: activityRecipients, skipLocked: true });
    for (const item of pending) {
      const prefs = notificationPreferencesSchema.parse(item.prefs ?? {});
      const preference = preferences[item.event.type];
      let successful = true;
      if (preference && prefs[preference]) {
        const subscriptions = await tx.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId,item.recipient.userId));
        for (const subscription of subscriptions) {
          try {
            await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ tag: item.event.id, title: "Spending Diary", body: "Your shared expenses have an update.", url: item.event.expenseId ? "/expenses/"+item.event.expenseId : "/activity" }), { vapidDetails: { subject, publicKey, privateKey }, agent: pushAgent, timeout: 3000, TTL: 3600 });
            delivered++;
          } catch (error) {
            const status = error instanceof webpush.WebPushError ? error.statusCode : 0;
            if (status === 404 || status === 410) await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.id,subscription.id));
            else successful = false;
          }
        }
      }
      if (successful) await tx.update(activityRecipients).set({ pushSentAt: new Date() }).where(and(eq(activityRecipients.activityId,item.recipient.activityId),eq(activityRecipients.userId,item.recipient.userId)));
    }
  });
  return { configured: true, delivered };
}
