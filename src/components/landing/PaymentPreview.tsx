import { ArrowRight, Check } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/money/Money";

export function PaymentPreview() {
  return (
    <figure aria-label="Example of a recorded UPI repayment">
      <Card className="gap-0 py-0">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <p className="flex items-center gap-2 text-sm">
            <Check
              className="size-4 text-muted-foreground"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            Payment recorded
          </p>
          <div className="flex items-center gap-3">
            <Avatar aria-hidden="true">
              <AvatarFallback>P</AvatarFallback>
            </Avatar>
            <span className="text-sm">Priya</span>
            <ArrowRight
              className="size-4 text-muted-foreground"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span className="text-sm">You</span>
          </div>
          <p className="text-2xl font-semibold tracking-tight">
            <Money amount={40000} />
          </p>
          <dl className="flex items-center justify-between gap-3 border-t border-dashed border-border pt-4 text-sm">
            <dt className="text-muted-foreground">Method</dt>
            <dd>UPI</dd>
          </dl>
        </CardContent>
      </Card>
      <figcaption className="sr-only">
        An example repayment from Priya, recorded after confirming the payment.
      </figcaption>
    </figure>
  );
}
