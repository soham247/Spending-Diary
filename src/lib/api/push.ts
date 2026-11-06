import { responseData } from "./client";
export async function apiEnablePush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) throw new Error("Push notifications are not supported in this browser.");
  const { publicKey } = await fetch("/api/push/config").then(responseData<{ publicKey: string | null }>);
  if (!publicKey) throw new Error("Push notifications are not configured on this deployment.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notifications are blocked. You can enable them in your browser settings.");
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const padding = "=".repeat((4 - publicKey.length % 4) % 4);
  const bytes = Uint8Array.from(atob((publicKey + padding).replace(/-/g,"+").replace(/_/g,"/")),c => c.charCodeAt(0));
  const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
  await fetch("/api/push/subscription",{ method: "PUT",headers: { "Content-Type": "application/json" },body: JSON.stringify(subscription.toJSON()) }).then(responseData<{ subscribed: boolean }>);
  return true;
}
