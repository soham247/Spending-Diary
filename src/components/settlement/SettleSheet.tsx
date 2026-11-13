"use client";
import { FormDrawer } from "@/components/common/FormDrawer";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/money/Money";
import { SettlePanel } from "./SettlePanel";
import { Card, CardContent } from "@/components/ui/card";
export function SettleSheet({
  viewerId,
  other,
  net,
  scopeId,
  currency = "INR",
  presentation = "card",
}: {
  viewerId: string;
  other: { id: string; name: string; upiId: string | null };
  net: number;
  scopeId: string;
  currency?: string;
  presentation?: "card" | "row";
}) {
  const content = (
    <>
      <p className="min-w-0 break-words text-sm">
        {net < 0 ? "You owe " + other.name : other.name + " owes you"}{" "}
        <Money
          amount={Math.abs(net)}
          currency={currency}
          tone={net < 0 ? "debit" : "credit"}
        />
      </p>
      <FormDrawer
        title={"Settle up with " + other.name}
        description="Record a payment after it happens. UPI opens your own payment app."
        trigger={
          <Button
            variant={presentation === "row" ? "outline" : "default"}
            className="min-h-11"
          >
            Settle up
          </Button>
        }
      >
        <SettlePanel
          viewerId={viewerId}
          other={other}
          net={net}
          scopeId={scopeId}
          currency={currency}
        />
      </FormDrawer>
    </>
  );
  return presentation === "row" ? (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {content}
    </div>
  ) : (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        {content}
      </CardContent>
    </Card>
  );
}
