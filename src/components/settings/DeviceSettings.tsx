"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSessions, useRevokeSession } from "@/hooks/use-sessions";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/common/ErrorState";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/common/LoadingState";
import { SettingsSection } from "./SettingsSection";
import { deviceLabel } from "@/lib/utils/device-label";
export function DeviceSettings() {
  const sessions = useSessions();
  const revoke = useRevokeSession();
  const router = useRouter();
  async function logout(token: string) {
    try {
      await revoke.mutateAsync(token);
      toast.success("Device signed out");
      router.refresh();
    } catch {
      toast.error("Couldn't sign out device");
    }
  }
  return (
    <SettingsSection title="Signed-in devices">
      {sessions.isPending ? (
        <LoadingState />
      ) : sessions.isError ? (
        <ErrorState retry={() => void sessions.refetch()} />
      ) : !sessions.data?.length ? (
        <p className="text-sm text-muted-foreground">
          No signed-in devices to show
        </p>
      ) : (
        <Card className="gap-0 py-0 divide-y divide-border">
          {sessions.data?.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between gap-3 p-4"
            >
              <p className="min-w-0 break-words text-sm font-medium">
                {deviceLabel(session.userAgent)}
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Signed in{" "}
                  {new Intl.DateTimeFormat("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(session.createdAt))}
                </span>
              </p>
              <Button
                className="shrink-0"
                variant="outline"
                aria-label={`Sign out ${deviceLabel(session.userAgent)}`}
                disabled={revoke.isPending}
                onClick={() => void logout(session.token)}
              >
                {revoke.isPending && revoke.variables === session.token
                  ? "Signing out…"
                  : "Sign out"}
              </Button>
            </div>
          ))}
        </Card>
      )}
    </SettingsSection>
  );
}
