"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto max-w-lg space-y-5 p-6">
          <h1 className="text-2xl font-semibold">Something went wrong.</h1>
          <p>Please try again.</p>
          <Button onClick={reset}>Try again</Button>
          <Link href="/home">Go home</Link>
        </main>
      </body>
    </html>
  );
}
