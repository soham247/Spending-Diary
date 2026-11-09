import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandIcon } from "@/components/brand/BrandIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Sign in - Spending Diary" };

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#auth-main"
        className="sr-only focus:not-sr-only focus:block focus:bg-muted focus:p-4"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-3 bg-background px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring"
        >
          <BrandIcon />
          Spending Diary
        </Link>
        <Button asChild variant="ghost" className="transition-colors">
          <Link href="/">
            <ArrowLeft
              className="size-4"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            Home
          </Link>
        </Button>
      </header>
      <main
        id="auth-main"
        tabIndex={-1}
        className="flex flex-1 scroll-mt-20 items-center justify-center px-4 py-8 sm:py-12"
      >
        <Card className="w-full max-w-md">
          <CardContent className="px-6 py-2 sm:py-3">{children}</CardContent>
        </Card>
      </main>
      <footer className="px-4 pb-6 text-center text-xs text-muted-foreground">
        Your share, in one place
      </footer>
    </div>
  );
}
