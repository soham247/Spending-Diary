"use client";

import { authFormError } from "@/lib/auth/form-error";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { loginFormSchema, type LoginFormInput } from "@/lib/validation/auth";
import { signIn } from "@/lib/auth/auth-client";

export default function LoginForm({
  callbackUrl,
  inviteToken,
}: {
  callbackUrl: string;
  inviteToken?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"email" | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInput>({
    resolver: zodResolver(loginFormSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  });
  async function submit(values: LoginFormInput) {
    setPending("email");
    setError(null);
    try {
      await signIn.email({
        ...values,
        callbackURL: callbackUrl,
        fetchOptions: { throw: true },
      });
      router.push(callbackUrl);
    } catch (cause) {
      const message = authFormError(cause, "Couldn't sign in. Try again.");
      setError(
        message.toLowerCase().includes("verif")
          ? "Verify your email before signing in."
          : /credentials|invalid/i.test(message)
            ? "Incorrect email or password. Try again."
            : message,
      );
      setPending(null);
    }
  }
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-medium tracking-tight">
          Sign in to your diary
        </h1>
      </div>
      {inviteToken && (
        <Alert>
          <AlertDescription>
            Sign in to continue with your invitation.
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error}
            {error.includes("Verify your email") && (
              <Link
                className="mt-2 inline-flex min-h-11 items-center underline underline-offset-4"
                href={"/verify-email?next=" + encodeURIComponent(callbackUrl)}
              >
                Request a verification link
              </Link>
            )}
          </AlertDescription>
        </Alert>
      )}
      <GoogleSignInButton />
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1" />
        <span>or</span>
        <Separator className="flex-1" />
      </div>
      <form
        onSubmit={handleSubmit(submit)}
        noValidate
        className="space-y-4"
        aria-busy={pending === "email"}
      >
        <fieldset disabled={pending !== null} className="min-w-0 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              required
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="you@example.com"
              {...register("email")}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && (
              <p
                id="email-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="inline-flex min-h-11 items-center rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              required
              id="password"
              autoComplete="current-password"
              {...register("password")}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            {errors.password && (
              <p
                id="password-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {errors.password.message}
              </p>
            )}
          </div>
        </fieldset>
        <Button
          type="submit"
          size="lg"
          className="w-full transition-colors"
          disabled={pending !== null}
        >
          {pending === "email" && (
            <LoaderCircle
              className="size-4 motion-safe:animate-spin"
              aria-hidden="true"
            />
          )}
          {pending === "email" ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="border-t border-border pt-4 text-sm text-muted-foreground">
        New here?{" "}
        <Link
          href={"/register?callbackUrl=" + encodeURIComponent(callbackUrl)}
          className="inline-flex min-h-11 items-center rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
