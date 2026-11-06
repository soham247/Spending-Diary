"use client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { notificationTypes, type NotificationPreferences } from "@/lib/validation/notifications";
import { PushPrompt } from "./PushPrompt";
export function NotificationSettings() {
  const profile = useProfile(); const update = useUpdateProfile();
  if (!profile.data) return null;
  async function change(key: keyof NotificationPreferences, value: boolean) {
    if (!profile.data) return;
    try { await update.mutateAsync({ notificationPrefs: { ...profile.data.notificationPrefs, [key]: value } }); } catch { toast.error("Couldn't save notification preference"); }
  }
  return <section className="space-y-4"><h2 className="text-lg font-semibold">Notifications</h2><PushPrompt /><div className="divide-y divide-border rounded-xl border border-border bg-card">{notificationTypes.map(type => <div key={type.key} className="flex items-center justify-between gap-3 p-4"><Label htmlFor={type.key}>{type.label}</Label><Switch id={type.key} checked={profile.data!.notificationPrefs[type.key]} disabled={update.isPending} onCheckedChange={value => void change(type.key,value)} /></div>)}</div></section>;
}
