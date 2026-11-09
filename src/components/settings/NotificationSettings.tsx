"use client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import {
  notificationTypes,
  type NotificationPreferences,
} from "@/lib/validation/notifications";
import { PushPrompt } from "./PushPrompt";
import { Card } from "@/components/ui/card";
import { SettingsSection } from "./SettingsSection";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
export function NotificationSettings() {
  const profile = useProfile();
  const update = useUpdateProfile();
  async function change(key: keyof NotificationPreferences, value: boolean) {
    if (!profile.data) return;
    try {
      await update.mutateAsync({
        notificationPrefs: { ...profile.data.notificationPrefs, [key]: value },
      });
      toast.success("Notification preference saved");
    } catch {
      toast.error("Couldn't save notification preference");
    }
  }
  return (
    <SettingsSection title="Notifications">
      {profile.isPending ? (
        <LoadingState />
      ) : profile.isError ? (
        <ErrorState retry={() => void profile.refetch()} />
      ) : (
        <>
          <PushPrompt />
          <Card className="gap-0 py-0 divide-y divide-border">
            {notificationTypes.map((type) => (
              <div
                key={type.key}
                className="flex items-center justify-between gap-3 p-4"
              >
                <Label htmlFor={type.key}>{type.label}</Label>
                <Switch
                  id={type.key}
                  checked={profile.data.notificationPrefs[type.key]}
                  disabled={update.isPending}
                  onCheckedChange={(value) => void change(type.key, value)}
                />
              </div>
            ))}
          </Card>
        </>
      )}
    </SettingsSection>
  );
}
