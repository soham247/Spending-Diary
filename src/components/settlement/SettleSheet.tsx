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
}: {
  viewerId: string;
  other: { id: string; name: string; upiId: string | null };
  net: number;
  scopeId: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <p>
          {net < 0 ? "You owe " + other.name : other.name + " owes you"}{" "}
          <Money amount={Math.abs(net)} tone={net < 0 ? "debit" : "credit"} />
        </p>
        <FormDrawer
          title={"Settle up with " + other.name}
          description="Record a payment after it happens. UPI opens your own payment app."
          trigger={<Button>Settle up</Button>}
        >
          <SettlePanel
            viewerId={viewerId}
            other={other}
            net={net}
            scopeId={scopeId}
          />
        </FormDrawer>
      </CardContent>
    </Card>
  );
}
