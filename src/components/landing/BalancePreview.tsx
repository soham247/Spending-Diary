import { Utensils } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/money/Money";

export function BalancePreview() {
  return (
    <figure
      aria-label="Example of a dinner split with friends"
      className="min-w-0"
    >
      <Card className="gap-0 py-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Utensils
              className="size-4 text-muted-foreground"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            Friday dinner
          </span>
          <span className="text-xs text-muted-foreground">Example</span>
        </div>
        <CardContent className="space-y-6 p-5 sm:p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Overall, you’re owed
            </p>
            <p className="text-4xl font-semibold tracking-tight sm:text-5xl">
              <Money amount={80000} tone="credit" />
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm">Paid by you</p>
                <p className="text-xs text-muted-foreground">
                  Split equally, 3 people
                </p>
              </div>
              <Money amount={120000} className="font-medium" />
            </div>
            <dl className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3">
              <dt className="text-sm text-muted-foreground">Your share</dt>
              <dd className="font-medium">
                <Money amount={40000} />
              </dd>
            </dl>
          </div>
          <div className="divide-y divide-border border-t border-dashed border-border">
            {["Priya", "Aman"].map((name) => (
              <div
                className="flex items-center gap-3 py-3 first:pt-3 last:pb-0"
                key={name}
              >
                <Avatar aria-hidden="true">
                  <AvatarFallback>{name[0]}</AvatarFallback>
                </Avatar>
                <p className="min-w-0 flex-1 text-sm">
                  {name}
                  <span className="block text-xs text-muted-foreground">
                    owes you
                  </span>
                </p>
                <Money
                  amount={40000}
                  tone="credit"
                  className="text-sm font-medium"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <figcaption className="sr-only">
        An illustrative equal split. Only your share counts as spending; your
        friends’ shares appear as money owed to you.
      </figcaption>
    </figure>
  );
}
