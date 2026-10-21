import type { Metadata } from "next";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset password — Spending Diary",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
