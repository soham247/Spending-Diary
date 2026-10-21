"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/auth-client";

interface Props {
  nextUrl: string;
  errorParam?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  "token-invalid": "This link has expired or was already used.",
  "token-expired": "This link has expired.",
  "verification-failed": "Verification failed. Please request a new link.",
};

export default function VerifyEmailClient({ nextUrl, errorParam }: Props) {
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const errorMessage = errorParam
    ? (ERROR_MESSAGES[errorParam] ?? "Verification failed. Please request a new link.")
    : null;

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setResending(true);
    setResendError(null);
    try {
      await authClient.sendVerificationEmail({
        email: resendEmail,
        callbackURL: `/verify-email?next=${encodeURIComponent(nextUrl)}`,
      });
      setResent(true);
    } catch (err: unknown) {
      setResendError(err instanceof Error ? err.message : "Failed to send. Try again.");
    } finally {
      setResending(false);
    }
  }

  // Error state — link was invalid
  if (errorMessage) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-semibold">Link not valid</h1>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </div>

        {resent ? (
          <p className="text-sm text-center text-muted-foreground">
            New link sent — check your inbox.
          </p>
        ) : (
          <form onSubmit={handleResend} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="resend-email">Send a new link</Label>
              <Input
                id="resend-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                required
              />
            </div>
            {resendError && (
              <p className="text-sm text-destructive">{resendError}</p>
            )}
            <Button id="btn-resend" type="submit" className="w-full" disabled={resending}>
              {resending ? "Sending…" : "Send new link"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  // No session, no error → user landed directly on /verify-email
  return (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Check your inbox</h1>
        <p className="text-sm text-muted-foreground">
          We sent you a verification link. Click it to activate your account.
        </p>
      </div>

      {resent ? (
        <p className="text-sm text-muted-foreground">New link sent — check your inbox.</p>
      ) : (
        <form onSubmit={handleResend} className="space-y-3 text-left">
          <div className="space-y-1.5">
            <Label htmlFor="resend-email-default">Resend to a different address</Label>
            <Input
              id="resend-email-default"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
            />
          </div>
          {resendError && <p className="text-sm text-destructive">{resendError}</p>}
          <Button
            id="btn-resend-default"
            type="submit"
            variant="outline"
            className="w-full"
            disabled={resending || !resendEmail}
          >
            {resending ? "Sending…" : "Send new link"}
          </Button>
        </form>
      )}

      <Link
        href="/login"
        className="block text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
      >
        Back to sign in
      </Link>
    </div>
  );
}
