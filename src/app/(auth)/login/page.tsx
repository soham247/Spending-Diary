import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOptionalSession } from "@/lib/auth/guards";
import { safeRedirect } from "@/lib/utils/url";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in — Spending Diary",
  description: "Sign in to split costs with friends and track your spending.",
};

interface Props {
  searchParams: Promise<{ callbackUrl?: string; invite?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { callbackUrl, invite } = await searchParams;

  // If the user already has a valid session, skip login
  const session = await getOptionalSession();
  if (session) {
    const destination = safeRedirect(callbackUrl, "/home");
    redirect(destination);
  }

  const callbackSafe = safeRedirect(callbackUrl, "/home");

  return <LoginForm callbackUrl={callbackSafe} inviteToken={invite} />;
}
