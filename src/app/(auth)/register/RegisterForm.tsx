"use client";

import { authFormError } from "@/lib/auth/form-error";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { LoaderCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import {
  registerFormSchema,
  type RegisterFormInput,
} from "@/lib/validation/auth";
import { signUp } from "@/lib/auth/auth-client";

export default function RegisterForm({ callbackUrl }: { callbackUrl: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"email" | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors },
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(registerFormSchema),
    mode: "onBlur",
    defaultValues: { name: "", email: "", password: "" },
  });
  async function submit(values: RegisterFormInput) {
    setPending("email");
    setError(null);
    try {
      await signUp.email({
        ...values,
        callbackURL: "/verify-email?next=" + encodeURIComponent(callbackUrl),
        fetchOptions: { throw: true },
      });
      resetField("password");
      setSentEmail(values.email);
    } catch (cause) {
      const message = authFormError(
        cause,
        "Couldn't create your account. Try again.",
      );
      setError(
        message.toLowerCase().includes("already")
          ? "An account with this email already exists. Sign in instead."
          : message,
      );
    } finally {
      setPending(null);
    }
  }
  const signInUrl = "/login?callbackUrl=" + encodeURIComponent(callbackUrl);
  if (sentEmail)
    return (
      <div className="space-y-5" role="status">
        <span className="flex size-12 items-center justify-center rounded-lg bg-muted">
          <Mail
            className="size-5 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-medium tracking-tight">
            Check your inbox
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Open the verification link sent to{" "}
            <strong className="break-all font-medium text-foreground">
              {sentEmail}
            </strong>{" "}
            to activate your account.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          If it is missing, check your spam folder.
        </p>
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href={"/verify-email?next=" + encodeURIComponent(callbackUrl)}>
            Request another link
          </Link>
        </Button>
        <Link
          href={signInUrl}
          className="inline-flex min-h-11 items-center rounded-sm text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
        >
          Back to sign in
        </Link>
      </div>
    );
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-medium tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">Start with your email</p>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
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
            <Label htmlFor="name">Name</Label>
            <Input
              required
              id="name"
              autoComplete="name"
              placeholder="Priya Sharma"
              {...register("name")}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && (
              <p
                id="name-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {errors.name.message}
              </p>
            )}
          </div>
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
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              required
              id="password"
              autoComplete="new-password"
              {...register("password")}
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password
                  ? "password-help password-error"
                  : "password-help"
              }
            />
            <p id="password-help" className="text-xs text-muted-foreground">
              10 to 128 characters
            </p>
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
          {pending === "email" ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="border-t border-border pt-4 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={signInUrl}
          className="inline-flex min-h-11 items-center rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
