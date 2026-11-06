"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function ErrorState({ message = "Couldn't load this page. Check your connection and try again.", retry }: { message?: string; retry?: () => void }) {
  return <div role="alert" className="space-y-4 rounded-xl border border-border bg-card p-6"><div className="space-y-2"><p className="font-medium">Something didn’t load</p><p className="text-sm leading-relaxed text-muted-foreground">{message}</p></div><div className="flex flex-wrap gap-2">{retry && <Button variant="outline" className="h-11" onClick={retry}><RefreshCw aria-hidden="true" strokeWidth={1.75} />Try again</Button>}<Button asChild variant="ghost" className="h-11"><Link href="/home">Go home</Link></Button></div></div>;
}
