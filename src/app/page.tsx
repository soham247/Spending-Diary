import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { BrandIcon } from "@/components/brand/BrandIcon";
import { getOptionalSession } from "@/lib/auth/guards";
import { Button } from "@/components/ui/button";
import { BalancePreview } from "@/components/landing/BalancePreview";
import { SpendingPreview } from "@/components/landing/SpendingPreview";
import { PaymentPreview } from "@/components/landing/PaymentPreview";

export default async function LandingPage() {
  if (await getOptionalSession()) redirect("/home");
  return (
    <div data-landing className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:block focus:rounded-md focus:bg-muted focus:p-4"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-4 border-b border-border bg-background">
        <Link
          href="/"
          aria-label="Spending Diary home"
          className="flex min-h-11 items-center gap-2 rounded-md font-semibold focus-visible:outline-2 focus-visible:outline-ring"
        >
          <BrandIcon />
          Spending Diary
        </Link>
        <nav
          aria-label="Main navigation"
          className="flex items-center gap-2 sm:gap-5"
        >
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <a href="#features">Features</a>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/login">Sign in</Link>
          </Button>
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        <section
          aria-labelledby="hero-title"
          className="grid items-center gap-8 py-10 sm:gap-12 sm:py-14 lg:grid-cols-2 lg:gap-16 lg:py-16"
        >
          <div className="landing-intro space-y-6">
            <h1
              id="hero-title"
              className="text-4xl font-medium leading-tight tracking-tight sm:text-5xl lg:text-6xl"
            >
              Split the bill
              <br />
              Know your share
            </h1>
            <p className="max-w-sm text-base leading-relaxed text-muted-foreground sm:text-lg">
              Shared expenses, your own spending, and a clear way to settle up
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="landing-action transition-colors"
              >
                <Link href="/register">
                  Start your diary
                  <ArrowRight strokeWidth={1.75} aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="transition-colors"
              >
                <a href="#features">See how it works</a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Free to use</p>
          </div>
          <BalancePreview />
        </section>
        <section
          aria-label="Ways to share expenses"
          className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y border-border py-4 text-sm text-muted-foreground"
        >
          <span>For the things you share</span>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>Friends</li>
            <li>Flatmates</li>
            <li>Trips</li>
            <li>Couples</li>
          </ul>
        </section>
        <section
          id="features"
          aria-labelledby="features-title"
          className="scroll-mt-20 space-y-8 py-10 sm:space-y-10 sm:py-14"
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <h2
              id="features-title"
              className="max-w-md text-2xl font-medium leading-tight tracking-tight sm:text-3xl"
            >
              A diary for your share
            </h2>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Split equally, by amount, percentage or shares
            </p>
          </div>
          <div className="grid items-start gap-8 sm:grid-cols-12 lg:gap-10">
            <section
              aria-labelledby="spending-title"
              className="space-y-4 sm:col-span-7"
            >
              <SpendingPreview />
              <div className="space-y-2">
                <h3 id="spending-title" className="text-lg font-medium">
                  See what you actually spend
                </h3>
                <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Your share of shared bills, plus your solo expenses
                </p>
              </div>
            </section>
            <section
              aria-labelledby="payment-title"
              className="space-y-4 sm:col-span-5"
            >
              <PaymentPreview />
              <div className="space-y-2">
                <h3 id="payment-title" className="text-lg font-medium">
                  Keep repayments separate
                </h3>
                <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Pay in your UPI app, then confirm it here
                </p>
              </div>
            </section>
          </div>
        </section>
        <section
          aria-labelledby="start-title"
          className="flex flex-col items-start justify-between gap-5 border-t border-border py-8 sm:flex-row sm:items-center sm:py-10"
        >
          <div className="space-y-2">
            <h2
              id="start-title"
              className="text-2xl font-medium tracking-tight"
            >
              Start with your next expense
            </h2>
            <p className="text-sm text-muted-foreground">
              Just for you, or shared with friends
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="landing-action transition-colors"
          >
            <Link href="/register">
              Create an account
              <ArrowRight strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </Button>
        </section>
      </main>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <BrandIcon className="size-5" />
          Spending Diary
        </span>
        <span>Shared expenses. Personal spending</span>
      </footer>
    </div>
  );
}
