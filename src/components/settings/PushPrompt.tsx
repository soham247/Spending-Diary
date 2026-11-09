"use client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBrowserPushStatus, useEnablePush } from "@/hooks/use-notifications";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { Card, CardContent } from "@/components/ui/card";
export function PushPrompt() {
  const profile = useProfile();
  const update = useUpdateProfile();
  const enable = useEnablePush();
  const status = useBrowserPushStatus();
  const enabled = enable.isSuccess && status === "granted";
  const canEnable = status === "default" || status === "granted";
  const description =
    status === "loading"
      ? "Checking this browser…"
      : status === "unsupported"
        ? "Push notifications aren't supported in this browser."
        : status === "denied"
          ? "Notifications are blocked. Allow them in your browser settings to continue."
          : enabled
            ? "Notifications are enabled for this account on this device."
            : status === "granted"
              ? "Browser permission is allowed. Enable to connect this account."
              : "Turn on alerts on this device";
  async function dismiss() {
    if (!profile.data) return;
    try {
      await update.mutateAsync({
        notificationPrefs: {
          ...profile.data.notificationPrefs,
          pushPrompted: true,
        },
      });
    } catch {
      toast.error("Couldn't save notification preference");
    }
  }
  async function request() {
    try {
      await enable.mutateAsync();
      toast.success("Notifications enabled");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Couldn't enable notifications",
      );
    } finally {
      await dismiss();
    }
  }
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1 basis-48 space-y-1" aria-live="polite">
          <p className="text-sm font-medium">Browser notifications</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canEnable && (
            <Button
              variant="outline"
              disabled={enabled || enable.isPending || update.isPending}
              onClick={() => void request()}
            >
              {enable.isPending
                ? "Enabling…"
                : enabled
                  ? "Enabled"
                  : "Enable notifications"}
            </Button>
          )}
          {!profile.data?.notificationPrefs.pushPrompted && (
            <Button
              variant="outline"
              disabled={update.isPending}
              onClick={() => void dismiss()}
            >
              Not now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
