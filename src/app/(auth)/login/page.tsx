"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React, { useState } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import {signIn} from "next-auth/react"

export default function LoginPage() {
  const { toast } = useToast();
  // const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const phone = formData.get("phone");
    const password = formData.get("password");

    if (!phone || !password) {
      setError("All fields are required");
      return;
    }

    setError("");
    try {
      setLoading(true);
      const response = await signIn("credentials", {
        phone: phone as string,
        password: password as string,
        redirect: false,
      })
      if (response?.ok) {
        toast({
          title: "Login successful",
          variant: "success",
          duration: 2000,
        });
        setTimeout(() => {
          window.location.href = "/expense";
        }, 300);
      }
    } catch{
        toast({
          title: "Something went wrong",
          variant: "destructive",
          duration: 3000,
        });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg transition-all dark:shadow-2xl md:p-8">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome back
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your details to sign in to your account
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium">
            Phone number
          </Label>
          <div className="relative">
            <Input
              id="phone"
              name="phone"
              type="text"
              placeholder="Enter your phone number"
              className="pl-10 transition-all focus-visible:ring-primary"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              className="pl-10 transition-all focus-visible:ring-primary"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </span>
          </div>
        </div>

        <button
          className={`w-full rounded-lg bg-primary px-4 py-3 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 ${
            loading ? "opacity-80 cursor-wait" : ""
          }`}
          type="submit"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </span>
          ) : (
            "Sign in"
          )}
        </button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            Create account
          </Link>
        </p>
      </form>
    </div>
  );
}
