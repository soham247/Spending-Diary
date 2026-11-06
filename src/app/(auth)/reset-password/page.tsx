import type { Metadata } from "next";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set new password — Spending Diary",
};

interface Props {
  searchParams: Promise<{ token?: string; error?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token, error } = await searchParams;
  return <ResetPasswordForm token={token} errorParam={error} />;
}
