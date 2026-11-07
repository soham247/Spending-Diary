"use client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useEnablePush } from "@/hooks/use-notifications";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { Card, CardContent } from "@/components/ui/card";
export function PushPrompt() {
  const profile = useProfile();
  const update = useUpdateProfile();
  const enable = useEnablePush();
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
      <CardContent className="space-y-3">
        <p>
          Get notified when friends change shared expenses, record payments or
          claim your invitations.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={enable.isPending || update.isPending}
            onClick={() => void request()}
          >
            {enable.isPending ? "Enabling…" : "Enable notifications"}
          </Button>
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
