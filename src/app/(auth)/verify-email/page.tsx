import type { Metadata } from "next";
import { getOptionalSession } from "@/lib/auth/guards";
import { safeRedirect } from "@/lib/utils/url";
import { redirect } from "next/navigation";
import VerifyEmailClient from "./VerifyEmailClient";

export const metadata: Metadata = {
  title: "Verify email — Spending Diary",
};

interface Props {
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { next, error } = await searchParams;
  const nextSafe = safeRedirect(next, "/home");

  // If there's no error and the user has a valid session, they already verified
  if (!error) {
    const session = await getOptionalSession();
    if (session) {
      redirect(nextSafe);
    }
  }

  return <VerifyEmailClient nextUrl={nextSafe} errorParam={error} />;
}
