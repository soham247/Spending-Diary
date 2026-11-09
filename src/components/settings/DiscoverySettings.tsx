"use client";

import { toast } from "sonner";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";

export function DiscoverySettings() {
  const profile = useProfile();
  const update = useUpdateProfile();
  if (profile.isPending) return <LoadingState />;
  if (profile.isError)
    return <ErrorState retry={() => void profile.refetch()} />;
  async function change(value: boolean) {
    try {
      await update.mutateAsync({ discoverableByEmail: value });
      toast.success("Privacy preference saved");
    } catch {
      toast.error("Couldn't save your privacy preference. Please try again.");
    }
  }
  return (
    <section className="max-w-md space-y-3" aria-label="Privacy">
      <h2 className="text-lg font-semibold">Privacy</h2>
      <div className="flex min-h-11 items-center justify-between gap-4">
        <Label htmlFor="email-discovery">
          Let people find me using my email
        </Label>
        <Switch
          id="email-discovery"
          checked={profile.data.discoverableByEmail}
          disabled={update.isPending}
          onCheckedChange={(value) => void change(value)}
          aria-describedby="email-discovery-help"
        />
      </div>
      <p id="email-discovery-help" className="text-sm text-muted-foreground">
        People who know your full email can send a request. Your email stays
        private. Turning this off also closes pending requests found through
        your email. Your friends, shared groups and connection links still work.
      </p>
    </section>
  );
}
