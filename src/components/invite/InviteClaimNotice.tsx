"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useReportInviteClaim } from "@/hooks/use-invites";
import { Button } from "@/components/ui/button";
import { claimActivityDetailsSchema } from "@/lib/validation/activity";
export function InviteClaimNotice({ metadata }: { metadata: unknown }) {
  const [key] = useState(() => crypto.randomUUID());
  const report = useReportInviteClaim();
  const details = claimActivityDetailsSchema.safeParse(metadata);
  if (!details.success) return null;
  async function submit() {
    if (!details.success) return;
    try {
      await report.mutateAsync({ id: details.data.before.inviteId, key });
      toast.success("Wrong claim reported for manual review");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't report claim");
    }
  }
  return (
    <div className="space-y-2 p-4">
      <p className="text-sm text-muted-foreground">
        Claimed by {details.data.after.name} ({details.data.after.email})
      </p>
      <Button
        variant="outline"
        disabled={report.isPending || report.isSuccess}
        onClick={() => void submit()}
      >
        {report.isSuccess ? "Reported for review" : "Report a wrong claim"}
      </Button>
    </div>
  );
}
