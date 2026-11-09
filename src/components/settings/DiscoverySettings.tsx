"use client";

import { toast } from "sonner";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { SettingsSection } from "./SettingsSection";

export function DiscoverySettings() {
  const profile = useProfile();
  const update = useUpdateProfile();
  async function change(value: boolean) {
    try {
      await update.mutateAsync({ discoverableByEmail: value });
      toast.success("Privacy preference saved");
    } catch {
      toast.error("Couldn't save your privacy preference. Please try again.");
    }
  }
  return (
    <SettingsSection title="Privacy">
      {profile.isPending ? (
        <LoadingState />
      ) : profile.isError ? (
        <ErrorState retry={() => void profile.refetch()} />
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <Label htmlFor="email-discovery">Find me by email</Label>
              <p
                id="email-discovery-help"
                className="text-sm text-muted-foreground"
              >
                People who know your full email can send a friend request. Your
                email stays private.
              </p>
            </div>
            <Switch
              id="email-discovery"
              checked={profile.data.discoverableByEmail}
              disabled={update.isPending}
              onCheckedChange={(value) => void change(value)}
              aria-describedby="email-discovery-help"
            />
          </div>
        </>
      )}
    </SettingsSection>
  );
}
