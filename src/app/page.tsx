import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, Utensils } from "lucide-react";
import { getOptionalSession } from "@/lib/auth/guards";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/money/Money";

export default async function LandingPage() {
  if (await getOptionalSession()) redirect("/home");
  return <div className="mx-auto max-w-5xl px-4 sm:px-6">
    <a href="#main" className="sr-only focus:not-sr-only focus:block focus:bg-card focus:p-4">Skip to content</a>
    <header className="flex items-center justify-between gap-3 border-b border-border py-4">
      <Link href="/" className="flex min-h-11 items-center gap-2 rounded-md font-semibold focus-visible:outline-2 focus-visible:outline-ring"><BookOpen className="size-5" strokeWidth={1.75} aria-hidden="true" />Spending Diary</Link>
      <Button asChild variant="ghost" className="h-11"><Link href="/login">Sign in<ArrowRight strokeWidth={1.75} aria-hidden="true" /></Link></Button>
    </header>
    <main id="main" tabIndex={-1} className="grid items-center gap-10 py-12 sm:py-20 lg:grid-cols-2 lg:gap-16">
      <section className="space-y-6">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Share the cost.<br />Keep track of<br className="hidden sm:block" /> your share.</h1>
        <p className="max-w-md text-lg leading-relaxed text-muted-foreground">Dinner with friends. Groceries for the flat. A weekend away. See who owes whom, and keep your own spending clear.</p>
        <div className="space-y-3"><Button asChild size="lg" className="w-full sm:w-auto"><Link href="/register">Create an account<ArrowRight strokeWidth={1.75} aria-hidden="true" /></Link></Button><p className="text-sm text-muted-foreground">Start with a personal expense or invite a friend</p></div>
      </section>
      <section aria-labelledby="example-title" className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4"><h2 id="example-title" className="text-sm font-medium">One dinner, three shares</h2><span className="text-xs text-muted-foreground">Example</span></div>
        <div className="space-y-6 p-6">
          <div className="flex items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><Utensils className="size-5" strokeWidth={1.75} aria-hidden="true" /></span><div><p className="font-medium">Friday dinner</p><p className="text-sm text-muted-foreground">You paid, split equally with 2 friends</p></div></div>
          <dl className="divide-y divide-border">
            <div className="flex items-center justify-between gap-4 py-4"><dt className="text-sm text-muted-foreground">The bill you paid</dt><dd className="font-medium"><Money amount={120000} currency="INR" tone="neutral" /></dd></div>
            <div className="flex items-center justify-between gap-4 py-4"><dt className="text-sm text-muted-foreground">Your spending</dt><dd className="font-medium"><Money amount={40000} currency="INR" tone="neutral" /></dd></div>
          </dl>
          <div className="rounded-md bg-credit-muted p-4"><p className="text-sm">Your friends owe you</p><p className="mt-1 text-3xl font-semibold"><Money amount={80000} currency="INR" tone="credit" /></p></div>
          <p className="text-sm leading-relaxed text-muted-foreground">Your diary counts your share. Record repayments separately, so they never inflate your spending.</p>
        </div>
      </section>
    </main>
    <footer className="border-t border-border py-6 text-sm text-muted-foreground">Shared expenses. Personal spending. One clear picture.</footer>
  </div>;
}
