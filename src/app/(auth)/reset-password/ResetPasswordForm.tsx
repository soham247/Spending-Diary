"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/auth-client";

interface Props {
  token?: string;
  errorParam?: string;
}

export default function ResetPasswordForm({ token, errorParam }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(errorParam ?? null);
  const [done, setDone] = useState(false);

  // No token or an error in the URL → the link was bad
  const tokenMissing = !token;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authClient.resetPassword({
        newPassword: password,
        token: token!,
      });
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (tokenMissing || errorParam) {
    return (
      <div className="space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Link not valid</h1>
          <p className="text-sm text-muted-foreground">
            This password-reset link has expired or was already used.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="block"
        >
          <Button id="btn-request-new-reset" className="w-full">
            Request a new link
          </Button>
        </Link>
        <Link
          href="/login"
          className="block text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold">Password updated</h1>
        <p className="text-sm text-muted-foreground">
          Your password has been changed. Redirecting to sign in…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Set a new password</h1>
        <p className="text-sm text-muted-foreground">
          Choose a strong password of at least 10 characters.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="at least 10 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={10}
            required
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="same password again"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        <Button id="btn-set-password" type="submit" className="w-full" disabled={loading}>
          {loading ? "Saving…" : "Set new password"}
        </Button>
      </form>
    </div>
  );
}
