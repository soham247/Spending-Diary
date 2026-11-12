import { Skeleton } from "@/components/ui/skeleton";

export function FriendsLoading() {
  return (
    <div role="status" aria-label="Loading friends" className="space-y-4">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex items-center gap-3 py-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48 max-w-full" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}
