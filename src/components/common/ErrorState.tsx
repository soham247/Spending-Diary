"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ErrorState({
  message = "Couldn't load this page. Check your connection and try again.",
  retry,
}: {
  message?: string;
  retry?: () => void;
}) {
  return (
    <Alert>
      <AlertTitle>Something didn’t load</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{message}</p>
        <div className="flex flex-wrap gap-2">
          {retry && (
            <Button variant="outline" onClick={retry}>
              <RefreshCw aria-hidden="true" strokeWidth={1.75} />
              Try again
            </Button>
          )}
          <Button asChild variant="ghost">
            <Link href="/home">Go home</Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
