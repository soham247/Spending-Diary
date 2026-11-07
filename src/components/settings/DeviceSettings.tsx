"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSessions, useRevokeSession } from "@/hooks/use-sessions";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/common/ErrorState";
import { Card } from "@/components/ui/card";
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
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Signed-in devices</h2>
      {sessions.isError ? (
        <ErrorState retry={() => void sessions.refetch()} />
      ) : (
        <Card className="gap-0 py-0 divide-y divide-border">
          {sessions.data?.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between gap-3 p-4"
            >
              <p className="min-w-0 break-words text-sm">
                {session.userAgent || "Browser session"}
                <span className="block text-muted-foreground">
                  Signed in {new Date(session.createdAt).toLocaleDateString()}
                </span>
              </p>
              <Button
                className="shrink-0"
                variant="outline"
                disabled={revoke.isPending}
                onClick={() => void logout(session.token)}
              >
                Sign out
              </Button>
            </div>
          ))}
        </Card>
      )}
    </section>
  );
}
