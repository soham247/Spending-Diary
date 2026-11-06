import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOptionalSession } from "@/lib/auth/guards";
import { safeRedirect } from "@/lib/utils/url";
import RegisterForm from "./RegisterForm";

export const metadata: Metadata = {
  title: "Create account — Spending Diary",
  description: "Create a free account to start splitting expenses.",
};

interface Props {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function RegisterPage({ searchParams }: Props) {
  const { callbackUrl } = await searchParams;
  const session = await getOptionalSession();
  if (session) redirect(safeRedirect(callbackUrl, "/home"));

  return <RegisterForm callbackUrl={safeRedirect(callbackUrl, "/home")} />;
}
