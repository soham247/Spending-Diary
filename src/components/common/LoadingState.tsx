import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState() {
  return <div role="status" aria-label="Loading" className="space-y-6"><span className="sr-only">Loading your diary</span><Skeleton className="h-7 w-40" /><div aria-hidden="true" className="space-y-3 border-b border-border pb-6"><Skeleton className="h-10 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-11 w-40" /></div><div aria-hidden="true" className="space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-20 w-full rounded-xl" /><Skeleton className="h-20 w-full rounded-xl" /></div></div>;
}
