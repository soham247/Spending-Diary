"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth/auth-client";

type Mode = "options" | "email-password" | "sent";

interface Props {
  callbackUrl: string;
  inviteToken?: string;
}

export default function LoginForm({ callbackUrl, inviteToken }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("options");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    try {
      await signIn.social({
        provider: "google",
        callbackURL: callbackUrl,
      });
    } catch {
      setError("Google sign-in failed. Please try again.");
      setLoading(false);
    }
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn.email({
        email,
        password,
        callbackURL: callbackUrl,
        fetchOptions: { throw: true },
      });
      router.push(callbackUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      if (msg.toLowerCase().includes("verify")) {
        setError("Please verify your email before signing in.");
      } else if (msg.toLowerCase().includes("credentials") || msg.toLowerCase().includes("invalid")) {
        setError("Incorrect email or password.");
      } else {
        setError(msg);
      }
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Invite context line */}
      {inviteToken && (
        <p className="text-sm text-center text-muted-foreground">
          You were invited to join a group. Sign in to accept.
        </p>
      )}

      {/* Tagline — shown only on the options screen */}
      {mode === "options" && (
        <p className="text-sm text-center text-muted-foreground">
          Split costs with friends, keep track of your own.
        </p>
      )}

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {mode === "options" && (
        <div className="space-y-3">
          <Button
            id="btn-google-signin"
            className="w-full gap-2"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <Chrome size={16} strokeWidth={1.75} />
            Continue with Google
          </Button>

          <Button
            id="btn-use-email"
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={() => setMode("email-password")}
            disabled={loading}
          >
            Use email instead
          </Button>
        </div>
      )}

      {mode === "email-password" && (
        <form onSubmit={handleEmailSignIn} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button id="btn-email-signin" type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            id="btn-google-signin-alt"
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <Chrome size={16} strokeWidth={1.75} />
            Continue with Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="text-foreground font-medium hover:underline underline-offset-4"
            >
              Create one
            </Link>
          </p>
        </form>
      )}

      {/* Footer link for sign-up */}
      {mode === "options" && (
        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link
            href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="text-foreground font-medium hover:underline underline-offset-4"
          >
            Create one
          </Link>
        </p>
      )}

      {/* Back link */}
      {mode !== "options" && (
        <button
          type="button"
          onClick={() => { setMode("options"); setError(null); }}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </button>
      )}
    </div>
  );
}
