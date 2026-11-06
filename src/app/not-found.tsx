import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() { return <main className="mx-auto max-w-lg space-y-5 px-4 py-16"><h1 className="text-2xl font-semibold">This page is not available.</h1><p className="text-muted-foreground">It may have been deleted, or you may not have access.</p><Button asChild size="lg"><Link href="/home">Go home</Link></Button></main>; }
