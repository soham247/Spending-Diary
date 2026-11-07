import type { ReactNode } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export function EmptyState({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardContent>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          {children}
        </p>
      </CardContent>
      {action && <CardFooter>{action}</CardFooter>}
    </Card>
  );
}
