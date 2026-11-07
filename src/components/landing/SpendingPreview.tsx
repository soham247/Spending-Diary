import { Car, Utensils } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/money/Money";

export function SpendingPreview() {
  return (
    <figure aria-label="Example of personal spending insights">
      <Card className="gap-0 py-0">
        <CardContent className="space-y-6 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Your spending</span>
            <span className="text-xs text-muted-foreground">This month</span>
          </div>
          <p className="text-3xl font-semibold tracking-tight">
            <Money amount={55000} />
          </p>
          <div className="space-y-5">
            <div className="space-y-2">
              <dl className="flex items-center justify-between gap-2 text-sm">
                <dt className="flex items-center gap-2">
                  <Utensils
                    className="size-4 text-muted-foreground"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  Food
                </dt>
                <dd>
                  <Money amount={40000} />
                </dd>
              </dl>
              <div className="h-2 rounded-full bg-muted" aria-hidden="true">
                <div className="h-full w-8/11 rounded-full bg-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <dl className="flex items-center justify-between gap-2 text-sm">
                <dt className="flex items-center gap-2">
                  <Car
                    className="size-4 text-muted-foreground"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  Transport
                </dt>
                <dd>
                  <Money amount={15000} />
                </dd>
              </dl>
              <div className="h-2 rounded-full bg-muted" aria-hidden="true">
                <div className="h-full w-3/11 rounded-full bg-primary" />
              </div>
            </div>
          </div>
          <p className="border-t border-border pt-4 text-sm text-muted-foreground">
            Your dinner share + your cab ride
          </p>
        </CardContent>
      </Card>
      <figcaption className="sr-only">
        An illustrative monthly spending breakdown for food and transport.
      </figcaption>
    </figure>
  );
}
