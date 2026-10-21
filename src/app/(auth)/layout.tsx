import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — Spending Diary",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <span className="text-xl font-semibold tracking-tight text-foreground">
            Spending Diary
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}