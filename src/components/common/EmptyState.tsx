import type { ReactNode } from "react";

export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="space-y-4 rounded-xl border border-border bg-card p-6"><p className="max-w-md text-sm leading-relaxed text-muted-foreground">{children}</p>{action}</div>;
}
