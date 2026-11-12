"use client";
import { QRCodeSVG } from "qrcode.react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCreateInvite, useRevokeInvite } from "@/hooks/use-invites";
import type { CreateInviteInput } from "@/lib/validation/invite";
export function InvitePanel({
  input,
  createLabel = "Create invite link",
}: {
  input: CreateInviteInput;
  createLabel?: string;
}) {
  const inputId = useId();
  const create = useCreateInvite();
  const revoke = useRevokeInvite();
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [invite, setInvite] = useState<{ id: string; token: string } | null>(
    null,
  );
  const link = invite ? window.location.origin + "/j/" + invite.token : "";
  async function generate() {
    try {
      setInvite(await create.mutateAsync({ input, key }));
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Couldn't create invitation",
      );
    }
  }
  async function share() {
    try {
      if (navigator.share)
        await navigator.share({
          title: "Spending Diary",
          text: "Join me on Spending Diary",
          url: link,
        });
      else {
        await navigator.clipboard.writeText(link);
        toast.success("Link copied");
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError"))
        toast.error("Couldn't share. Copy the link below.");
    }
  }
  async function reset() {
    if (!invite) return;
    try {
      await revoke.mutateAsync(invite.id);
      setInvite(null);
      setKey(crypto.randomUUID());
      toast.success("Invite link revoked");
    } catch {
      toast.error("Couldn't revoke invite");
    }
  }
  return (
    <div className="space-y-3">
      {!invite ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => void generate()}
          className="min-h-11"
          disabled={create.isPending}
        >
          {create.isPending ? "Creating…" : createLabel}
        </Button>
      ) : (
        <>
          <QRCodeSVG
            value={link}
            title="Invitation QR code"
            className="size-40"
          />
          <Label htmlFor={inputId}>Invite link</Label>
          <Input
            id={inputId}
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
          />
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              className="min-h-11"
              onClick={() => void share()}
            >
              Share invite link
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void navigator.clipboard
                  .writeText(link)
                  .then(() => toast.success("Link copied"))
                  .catch(() => toast.error("Select and copy the link above."))
              }
              className="min-h-11"
            >
              Copy link
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" className="min-h-11">
                  Revoke link
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Revoke this invite link?</AlertDialogTitle>
                  <AlertDialogDescription>
                    People with this link will need a new invitation.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void reset()}>
                    Revoke link
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <p className="text-sm text-muted-foreground">
            {input.type === "PERSONAL"
              ? "You choose whether to accept connection requests"
              : input.type === "DIRECT"
                ? "This link can be claimed once and expires after 30 days."
                : "This link expires after 14 days."}
          </p>
        </>
      )}
    </div>
  );
}
