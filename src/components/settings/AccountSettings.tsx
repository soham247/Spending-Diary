"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAnonymizeAccount } from "@/hooks/use-sessions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsSection } from "./SettingsSection";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
export function AccountSettings() {
  const [password, setPassword] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remove = useAnonymizeAccount();
  const router = useRouter();
  async function anonymize() {
    setError(null);
    try {
      await remove.mutateAsync(password || undefined);
      setPassword("");
      router.replace("/login");
      router.refresh();
    } catch (e) {
      setPassword("");
      const message =
        e instanceof Error ? e.message : "Couldn't delete account";
      setError(message);
      toast.error(message);
    }
  }
  return (
    <SettingsSection title="Account">
      <p className="text-sm text-muted-foreground">
        Account deletion replaces your identity with “Former member”. Shared
        financial history and balances remain.
      </p>
      <AlertDialog
        open={open}
        onOpenChange={(value) => {
          if (remove.isPending) return;
          setOpen(value);
          setPassword("");
          setError(null);
        }}
      >
        <AlertDialogTrigger asChild>
          <Button variant="destructive">Delete account</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Your credentials, sessions and personal
              contact details will be removed. Shared history remains as Former
              member.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!remove.isPending) void anonymize();
            }}
            className="space-y-4"
          >
            <Label htmlFor="delete-password">
              Current password (for password accounts)
            </Label>
            <Input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              disabled={remove.isPending}
              aria-invalid={!!error}
              aria-describedby={error ? "delete-account-error" : undefined}
              onChange={(event) => setPassword(event.target.value)}
            />
            {error && (
              <p
                id="delete-account-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {error}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={remove.isPending}>
                Cancel
              </AlertDialogCancel>
              <Button
                type="submit"
                variant="destructive"
                disabled={remove.isPending}
              >
                {remove.isPending ? "Deleting…" : "Delete account"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}
